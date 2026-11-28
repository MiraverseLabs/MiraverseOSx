using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Net;
using System.Text.Json;
using System.Threading.Tasks;
using Microsoft.Data.Sqlite;

namespace MiraverseOSx;

/// <summary>
/// Authoritative backend endpoints for the Meridion Species Registry backed by miraverse.db.
/// Serves species catalog, facets, abilities, related records, celestial choirs, magical disciplines,
/// wildlife populations, offline artwork assets, and character species validation.
/// </summary>
internal sealed class SpeciesRegistryApi
{
    private readonly string dbPath;

    private static readonly HashSet<string> ValidRealms = new(StringComparer.OrdinalIgnoreCase)
    {
        "Orynvell", "Fross", "Lumia", "Marlowe", "Brisland", "Kaji", "Nephele", "Ve’Raylia", "Ve'Raylia",
        "Multiple realms", "Nephele / diaspora"
    };

    public SpeciesRegistryApi()
    {
        dbPath = DatabasePaths.ResolveSourceDatabase();
    }

    private SqliteConnection OpenReadOnly()
    {
        var conn = new SqliteConnection($"Data Source={dbPath};Mode=ReadOnly");
        conn.Open();
        return conn;
    }

    private SqliteConnection OpenReadWrite()
    {
        var conn = new SqliteConnection($"Data Source={dbPath};Mode=ReadWrite");
        conn.Open();
        using var pragma = conn.CreateCommand();
        pragma.CommandText = "PRAGMA foreign_keys = ON; PRAGMA busy_timeout = 10000;";
        pragma.ExecuteNonQuery();
        return conn;
    }

    public async Task<bool> HandleRoute(HttpListenerContext context, string subRoute)
    {
        var request = context.Request;
        var response = context.Response;
        response.Headers["Cache-Control"] = "no-store";

        if (!request.IsLocal)
        {
            await WorldSaveApi.Reply(response, 403, new { error = "Local access only." });
            return true;
        }

        var route = subRoute.Trim('/');
        try
        {
            if (request.HttpMethod == "GET" && string.IsNullOrEmpty(route))
            {
                await HandleListSpecies(request, response);
                return true;
            }
            if (request.HttpMethod == "GET" && route.Equals("facets", StringComparison.OrdinalIgnoreCase))
            {
                await HandleFacets(response);
                return true;
            }
            if (request.HttpMethod == "GET" && route.Equals("celestial", StringComparison.OrdinalIgnoreCase))
            {
                await HandleCelestial(response);
                return true;
            }
            if (request.HttpMethod == "GET" && route.Equals("disciplines", StringComparison.OrdinalIgnoreCase))
            {
                await HandleDisciplines(response);
                return true;
            }
            if (request.HttpMethod == "GET" && route.Equals("wildlife", StringComparison.OrdinalIgnoreCase))
            {
                await HandleWildlife(request, response);
                return true;
            }
            if (request.HttpMethod == "GET" && route.Equals("assets", StringComparison.OrdinalIgnoreCase))
            {
                await HandleAssets(response);
                return true;
            }
            if (request.HttpMethod == "POST" && route.Equals("validate-character", StringComparison.OrdinalIgnoreCase))
            {
                await HandleValidateCharacter(request, response);
                return true;
            }
            if (request.HttpMethod == "GET" && route.Equals("character-reviews", StringComparison.OrdinalIgnoreCase))
            {
                await HandleListCharacterReviews(response);
                return true;
            }
            if ((request.HttpMethod == "PUT" || request.HttpMethod == "PATCH")
                && route.StartsWith("character-reviews/", StringComparison.OrdinalIgnoreCase))
            {
                var charId = Uri.UnescapeDataString(route["character-reviews/".Length..]).Trim('/');
                await HandleSaveCharacterReview(request, response, charId);
                return true;
            }

            if (request.HttpMethod == "GET")
            {
                var segments = route.Split('/', StringSplitOptions.RemoveEmptyEntries)
                    .Select(Uri.UnescapeDataString)
                    .ToArray();
                if (segments.Length == 1)
                {
                    await HandleGetSpecies(request, response, segments[0]);
                    return true;
                }
                if (segments.Length == 2 && segments[1].Equals("abilities", StringComparison.OrdinalIgnoreCase))
                {
                    await HandleGetSpeciesAbilities(response, segments[0]);
                    return true;
                }
                if (segments.Length == 2 && segments[1].Equals("related", StringComparison.OrdinalIgnoreCase))
                {
                    await HandleGetRelatedSpecies(response, segments[0]);
                    return true;
                }
            }

            await WorldSaveApi.Reply(response, 404, new { error = $"Unknown species registry route: {route}" });
            return true;
        }
        catch (Exception ex)
        {
            await WorldSaveApi.Reply(response, 500, new { error = ex.Message });
            return true;
        }
    }

    private static List<string> ParseStringList(string? json)
    {
        if (string.IsNullOrWhiteSpace(json)) return new List<string>();
        try { return JsonSerializer.Deserialize<List<string>>(json) ?? new List<string>(); }
        catch { return new List<string>(); }
    }

    private static Dictionary<string, string> ParseStringMap(string? json)
    {
        if (string.IsNullOrWhiteSpace(json)) return new Dictionary<string, string>();
        try { return JsonSerializer.Deserialize<Dictionary<string, string>>(json) ?? new Dictionary<string, string>(); }
        catch { return new Dictionary<string, string>(); }
    }

    private static string? ResolveSpeciesId(SqliteConnection db, string idOrSlug)
    {
        using var cmd = db.CreateCommand();
        cmd.CommandText = """
            SELECT id FROM Species
            WHERE lower(id) = lower($key) OR lower(slug) = lower($key) OR lower(name) = lower($key)
            LIMIT 1
            """;
        cmd.Parameters.AddWithValue("$key", idOrSlug.Trim());
        var result = cmd.ExecuteScalar();
        return result == null || result == DBNull.Value ? null : Convert.ToString(result);
    }

    private static Dictionary<string, List<object>> LoadAssetsBySpecies(SqliteConnection db)
    {
        var map = new Dictionary<string, List<object>>(StringComparer.OrdinalIgnoreCase);
        using var cmd = db.CreateCommand();
        cmd.CommandText = """
            SELECT asset_id, species_id, realm, asset_kind, title, relative_path, mime_type, file_size_bytes
            FROM SpeciesAssets
            WHERE species_id IS NOT NULL
            ORDER BY asset_kind, asset_id
            """;
        using var r = cmd.ExecuteReader();
        while (r.Read())
        {
            var sid = r.GetString(1);
            if (!map.TryGetValue(sid, out var list))
            {
                list = new List<object>();
                map[sid] = list;
            }
            list.Add(new
            {
                assetId = r.GetString(0),
                speciesId = sid,
                realm = r.IsDBNull(2) ? null : r.GetString(2),
                kind = r.GetString(3),
                title = r.GetString(4),
                url = r.GetString(5),
                mimeType = r.GetString(6),
                fileSizeBytes = r.GetInt64(7),
            });
        }
        return map;
    }

    private async Task HandleListSpecies(HttpListenerRequest request, HttpListenerResponse response)
    {
        var q = request.QueryString["q"]?.Trim() ?? "";
        var realm = request.QueryString["realm"]?.Trim() ?? "";
        var category = request.QueryString["category"]?.Trim() ?? "";
        var family = request.QueryString["family"]?.Trim() ?? "";
        var classification = request.QueryString["classification"]?.Trim() ?? "";
        var affinity = request.QueryString["affinity"]?.Trim() ?? "";
        var includeCanonMeta = string.Equals(request.QueryString["includeCanonMeta"], "true", StringComparison.OrdinalIgnoreCase);
        var limit = int.TryParse(request.QueryString["limit"], out var parsedLimit) ? Math.Clamp(parsedLimit, 1, 500) : 500;
        var offset = int.TryParse(request.QueryString["offset"], out var parsedOffset) ? Math.Max(parsedOffset, 0) : 0;

        using var db = OpenReadOnly();
        var assetsBySpecies = LoadAssetsBySpecies(db);
        var clauses = new List<string>();
        var parameters = new List<(string Name, object Value)>();

        if (!string.IsNullOrEmpty(realm))
        {
            clauses.Add("lower(s.realm) = lower($realm)");
            parameters.Add(("$realm", realm));
        }
        if (!string.IsNullOrEmpty(category))
        {
            clauses.Add("lower(s.category) = lower($category)");
            parameters.Add(("$category", category));
        }
        if (!string.IsNullOrEmpty(family))
        {
            clauses.Add("(lower(s.family_name) = lower($family) OR lower(s.family_id) = lower($family))");
            parameters.Add(("$family", family));
        }
        if (!string.IsNullOrEmpty(classification))
        {
            if (classification.Equals("sapient", StringComparison.OrdinalIgnoreCase))
            {
                clauses.Add("s.is_sapient = 1");
            }
            else if (classification.Equals("fauna", StringComparison.OrdinalIgnoreCase))
            {
                clauses.Add("s.is_fauna = 1");
            }
            else if (classification.Equals("biological", StringComparison.OrdinalIgnoreCase))
            {
                clauses.Add("s.is_biological_species = 1");
            }
            else
            {
                clauses.Add("lower(s.classification_type) = lower($classification)");
                parameters.Add(("$classification", classification));
            }
        }
        if (!string.IsNullOrEmpty(affinity))
        {
            clauses.Add("(lower(s.affinity) LIKE lower($affinityLike) OR EXISTS (SELECT 1 FROM SpeciesAffinities sa WHERE sa.species_id = s.id AND lower(sa.affinity_name) LIKE lower($affinityLike)))");
            parameters.Add(("$affinityLike", $"%{affinity}%"));
        }
        if (!string.IsNullOrEmpty(q))
        {
            var terms = q.Split(' ', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);
            for (int i = 0; i < terms.Length; i++)
            {
                var pName = $"$q{i}";
                clauses.Add($"(lower(s.id) LIKE {pName} OR lower(s.name) LIKE {pName} OR lower(s.realm) LIKE {pName} OR lower(s.category) LIKE {pName} OR lower(s.family_name) LIKE {pName} OR lower(s.affinity) LIKE {pName} OR lower(s.description) LIKE {pName} OR lower(COALESCE(s.abilities_summary,'')) LIKE {pName} OR lower(COALESCE(p.summary,'')) LIKE {pName} OR lower(COALESCE(h.habitat_summary,'')) LIKE {pName})");
                parameters.Add((pName, $"%{terms[i].ToLowerInvariant()}%"));
            }
        }

        var whereSql = clauses.Count > 0 ? "WHERE " + string.Join(" AND ", clauses) : "";

        long total;
        using (var countCmd = db.CreateCommand())
        {
            countCmd.CommandText = $"""
                SELECT COUNT(*)
                FROM Species s
                LEFT JOIN SpeciesPhysiology p ON p.species_id = s.id
                LEFT JOIN SpeciesHabitats h ON h.species_id = s.id AND h.is_native = 1
                {whereSql}
                """;
            foreach (var (name, val) in parameters) countCmd.Parameters.AddWithValue(name, val);
            total = Convert.ToInt64(countCmd.ExecuteScalar());
        }

        var items = new List<object>();
        using (var cmd = db.CreateCommand())
        {
            cmd.CommandText = $"""
                SELECT s.id, s.name, s.slug, s.realm, s.category, s.family_id, s.family_name,
                       s.classification_type, s.is_biological_species, s.is_sapient, s.is_fauna,
                       s.is_playable_lineage, s.affinity, s.description, s.canon_status, s.is_provisional,
                       s.lifespan, s.profile_status, s.abilities_summary, s.limitations,
                       s.ability_constraints, s.power_review,
                       COALESCE(p.summary, '') AS physiology,
                       COALESCE(h.habitat_summary, '') AS habitat,
                       s.raw_json
                FROM Species s
                LEFT JOIN SpeciesPhysiology p ON p.species_id = s.id
                LEFT JOIN SpeciesHabitats h ON h.species_id = s.id AND h.is_native = 1
                {whereSql}
                ORDER BY s.id
                LIMIT $limit OFFSET $offset
                """;
            foreach (var (name, val) in parameters) cmd.Parameters.AddWithValue(name, val);
            cmd.Parameters.AddWithValue("$limit", limit);
            cmd.Parameters.AddWithValue("$offset", offset);

            using var r = cmd.ExecuteReader();
            while (r.Read())
            {
                var id = r.GetString(0);
                using var rawDoc = JsonDocument.Parse(r.GetString(24));
                var root = rawDoc.RootElement;
                string GetRaw(string prop) => root.TryGetProperty(prop, out var v) && v.ValueKind == JsonValueKind.String ? v.GetString() ?? "" : "";

                var refs = new List<object>();
                if (root.TryGetProperty("powerReferences", out var refArr) && refArr.ValueKind == JsonValueKind.Array)
                {
                    foreach (var el in refArr.EnumerateArray())
                    {
                        refs.Add(new
                        {
                            title = el.TryGetProperty("title", out var t) ? t.GetString() ?? "" : "",
                            url = el.TryGetProperty("url", out var u) ? u.GetString() ?? "" : "",
                            verification = el.TryGetProperty("verification", out var v) ? v.GetString() ?? "" : "",
                        });
                    }
                }

                items.Add(new
                {
                    id,
                    name = r.GetString(1),
                    slug = r.GetString(2),
                    realm = r.GetString(3),
                    category = r.GetString(4),
                    familyId = r.GetString(5),
                    family = r.GetString(6),
                    classificationType = r.GetString(7),
                    isBiologicalSpecies = r.GetInt32(8) == 1,
                    isSapient = r.GetInt32(9) == 1,
                    isFauna = r.GetInt32(10) == 1,
                    isPlayableLineage = r.GetInt32(11) == 1,
                    affinity = r.GetString(12),
                    description = r.GetString(13),
                    lifespan = r.IsDBNull(16) ? "" : r.GetString(16),
                    abilities = r.IsDBNull(18) ? "" : r.GetString(18),
                    limitations = r.IsDBNull(19) ? "" : r.GetString(19),
                    abilityConstraints = r.IsDBNull(20) ? "" : r.GetString(20),
                    physiology = r.GetString(22),
                    habitat = r.GetString(23),
                    passiveAbilities = GetRaw("passiveAbilities"),
                    activePowers = GetRaw("activePowers"),
                    techniques = GetRaw("techniques"),
                    exceptionalManifestations = GetRaw("exceptionalManifestations"),
                    powerReferences = refs,
                    assets = assetsBySpecies.TryGetValue(id, out var list) ? list : new List<object>(),
                    // Developer-only canon metadata only included when requested
                    status = includeCanonMeta ? r.GetString(14) : null,
                    isProvisional = includeCanonMeta ? (bool?)(r.GetInt32(15) == 1) : null,
                    profileStatus = includeCanonMeta ? (r.IsDBNull(17) ? "" : r.GetString(17)) : null,
                    powerReview = includeCanonMeta ? (r.IsDBNull(21) ? "" : r.GetString(21)) : null,
                });
            }
        }

        await WorldSaveApi.Reply(response, 200, new
        {
            total,
            limit,
            offset,
            count = items.Count,
            records = items,
        });
    }

    private async Task HandleFacets(HttpListenerResponse response)
    {
        using var db = OpenReadOnly();

        List<object> QueryCounts(string sql)
        {
            var list = new List<object>();
            using var cmd = db.CreateCommand();
            cmd.CommandText = sql;
            using var r = cmd.ExecuteReader();
            while (r.Read())
            {
                list.Add(new { name = r.GetString(0), count = r.GetInt64(1) });
            }
            return list;
        }

        var realms = QueryCounts("SELECT realm, COUNT(*) FROM Species GROUP BY realm ORDER BY realm");
        var categories = QueryCounts("SELECT category, COUNT(*) FROM Species GROUP BY category ORDER BY COUNT(*) DESC, category");
        var families = QueryCounts("SELECT family_name, COUNT(*) FROM Species GROUP BY family_name ORDER BY family_name");
        var classifications = QueryCounts("SELECT classification_type, COUNT(*) FROM Species GROUP BY classification_type ORDER BY COUNT(*) DESC, classification_type");
        var affinities = QueryCounts("SELECT affinity_name, COUNT(DISTINCT species_id) FROM SpeciesAffinities GROUP BY affinity_name ORDER BY COUNT(DISTINCT species_id) DESC, affinity_name");

        var assets = LoadAllAssets(db);
        long total;
        using (var c = db.CreateCommand())
        {
            c.CommandText = "SELECT COUNT(*) FROM Species";
            total = Convert.ToInt64(c.ExecuteScalar());
        }

        await WorldSaveApi.Reply(response, 200, new
        {
            total,
            realms,
            categories,
            families,
            classifications,
            affinities,
            assets,
        });
    }

    private static List<object> LoadAllAssets(SqliteConnection db)
    {
        var assets = new List<object>();
        using var cmd = db.CreateCommand();
        cmd.CommandText = """
            SELECT asset_id, species_id, realm, asset_kind, title, relative_path, mime_type, file_size_bytes
            FROM SpeciesAssets
            ORDER BY asset_kind, title
            """;
        using var r = cmd.ExecuteReader();
        while (r.Read())
        {
            assets.Add(new
            {
                assetId = r.GetString(0),
                speciesId = r.IsDBNull(1) ? null : r.GetString(1),
                realm = r.IsDBNull(2) ? null : r.GetString(2),
                kind = r.GetString(3),
                title = r.GetString(4),
                url = r.GetString(5),
                mimeType = r.GetString(6),
                fileSizeBytes = r.GetInt64(7),
            });
        }
        return assets;
    }

    private async Task HandleGetSpecies(HttpListenerRequest request, HttpListenerResponse response, string idOrSlug)
    {
        var includeCanonMeta = string.Equals(request.QueryString["includeCanonMeta"], "true", StringComparison.OrdinalIgnoreCase);
        using var db = OpenReadOnly();
        var sid = ResolveSpeciesId(db, idOrSlug);
        if (sid == null)
        {
            await WorldSaveApi.Reply(response, 404, new { error = $"Species record not found: {idOrSlug}" });
            return;
        }

        using var cmd = db.CreateCommand();
        cmd.CommandText = """
            SELECT id, name, slug, realm, category, family_id, family_name,
                   classification_type, is_biological_species, is_sapient, is_fauna,
                   is_playable_lineage, affinity, description, canon_status, is_provisional,
                   lifespan, profile_status, abilities_summary, limitations,
                   ability_constraints, power_review, raw_json
            FROM Species WHERE id = $id
            """;
        cmd.Parameters.AddWithValue("$id", sid);
        using var r = cmd.ExecuteReader();
        if (!r.Read())
        {
            await WorldSaveApi.Reply(response, 404, new { error = $"Species record not found: {idOrSlug}" });
            return;
        }

        using var rawDoc = JsonDocument.Parse(r.GetString(22));
        var root = rawDoc.RootElement;
        string GetRaw(string prop) => root.TryGetProperty(prop, out var v) && v.ValueKind == JsonValueKind.String ? v.GetString() ?? "" : "";

        var record = new
        {
            id = r.GetString(0),
            name = r.GetString(1),
            slug = r.GetString(2),
            realm = r.GetString(3),
            category = r.GetString(4),
            familyId = r.GetString(5),
            family = r.GetString(6),
            classificationType = r.GetString(7),
            isBiologicalSpecies = r.GetInt32(8) == 1,
            isSapient = r.GetInt32(9) == 1,
            isFauna = r.GetInt32(10) == 1,
            isPlayableLineage = r.GetInt32(11) == 1,
            affinity = r.GetString(12),
            description = r.GetString(13),
            lifespan = r.IsDBNull(16) ? "" : r.GetString(16),
            abilitiesSummary = r.IsDBNull(18) ? "" : r.GetString(18),
            limitations = r.IsDBNull(19) ? "" : r.GetString(19),
            abilityConstraints = r.IsDBNull(20) ? "" : r.GetString(20),
            passiveAbilities = GetRaw("passiveAbilities"),
            activePowers = GetRaw("activePowers"),
            techniques = GetRaw("techniques"),
            exceptionalManifestations = GetRaw("exceptionalManifestations"),
            status = includeCanonMeta ? r.GetString(14) : null,
            isProvisional = includeCanonMeta ? (bool?)(r.GetInt32(15) == 1) : null,
            profileStatus = includeCanonMeta ? (r.IsDBNull(17) ? "" : r.GetString(17)) : null,
            powerReview = includeCanonMeta ? (r.IsDBNull(21) ? "" : r.GetString(21)) : null,
        };

        var abilities = LoadAbilities(db, sid);
        var affinities = LoadAffinities(db, sid);
        var physiology = LoadPhysiology(db, sid);
        var inheritance = LoadInheritance(db, sid);
        var habitats = LoadHabitats(db, sid);
        var references = LoadReferences(db, sid);
        var assets = LoadSpeciesAssets(db, sid, record.realm);
        var related = LoadRelated(db, sid, record.familyId, record.realm, record.category);

        await WorldSaveApi.Reply(response, 200, new
        {
            record,
            abilities,
            affinities,
            physiology,
            inheritance,
            habitats,
            references,
            assets,
            related,
        });
    }

    private static List<object> LoadAbilities(SqliteConnection db, string sid)
    {
        var list = new List<object>();
        using var cmd = db.CreateCommand();
        cmd.CommandText = """
            SELECT ability_type, ability_name, description, is_innate, is_learned, is_hereditary_restricted, constraints
            FROM SpeciesAbilities WHERE species_id = $id ORDER BY sort_order, id
            """;
        cmd.Parameters.AddWithValue("$id", sid);
        using var r = cmd.ExecuteReader();
        while (r.Read())
        {
            list.Add(new
            {
                type = r.GetString(0),
                name = r.GetString(1),
                description = r.IsDBNull(2) ? "" : r.GetString(2),
                isInnate = r.GetInt32(3) == 1,
                isLearned = r.GetInt32(4) == 1,
                isHereditaryRestricted = r.GetInt32(5) == 1,
                constraints = r.IsDBNull(6) ? "" : r.GetString(6),
            });
        }
        return list;
    }

    private static List<object> LoadAffinities(SqliteConnection db, string sid)
    {
        var list = new List<object>();
        using var cmd = db.CreateCommand();
        cmd.CommandText = "SELECT affinity_name, realm_alignment, is_primary, inheritance_mode FROM SpeciesAffinities WHERE species_id = $id ORDER BY is_primary DESC, id";
        cmd.Parameters.AddWithValue("$id", sid);
        using var r = cmd.ExecuteReader();
        while (r.Read())
        {
            list.Add(new
            {
                affinity = r.GetString(0),
                realmAlignment = r.IsDBNull(1) ? null : r.GetString(1),
                isPrimary = r.GetInt32(2) == 1,
                inheritanceMode = r.GetString(3),
            });
        }
        return list;
    }

    private static object? LoadPhysiology(SqliteConnection db, string sid)
    {
        using var cmd = db.CreateCommand();
        cmd.CommandText = """
            SELECT summary, lifespan, skin_traits_json, hair_traits_json, eye_traits_json, ear_traits_json,
                   morphological_features_json, regional_genetics_json, alternative_forms_json, environmental_requirements
            FROM SpeciesPhysiology WHERE species_id = $id
            """;
        cmd.Parameters.AddWithValue("$id", sid);
        using var r = cmd.ExecuteReader();
        if (!r.Read()) return null;
        return new
        {
            summary = r.GetString(0),
            lifespan = r.IsDBNull(1) ? "" : r.GetString(1),
            skinTraits = ParseStringList(r.GetString(2)),
            hairTraits = ParseStringList(r.GetString(3)),
            eyeTraits = ParseStringList(r.GetString(4)),
            earTraits = ParseStringList(r.GetString(5)),
            morphologicalFeatures = ParseStringList(r.GetString(6)),
            regionalGenetics = ParseStringMap(r.GetString(7)),
            alternativeForms = ParseStringList(r.GetString(8)),
            environmentalRequirements = r.IsDBNull(9) ? "" : r.GetString(9),
        };
    }

    private static object? LoadInheritance(SqliteConnection db, string sid)
    {
        using var cmd = db.CreateCommand();
        cmd.CommandText = """
            SELECT inheritance_model, supports_dominant, supports_dual, supports_composite,
                   supports_dormant, supports_ancestral, supports_multiple,
                   regional_variants_json, hereditary_restrictions, pure_nether_cap_pct, notes
            FROM SpeciesInheritance WHERE species_id = $id
            """;
        cmd.Parameters.AddWithValue("$id", sid);
        using var r = cmd.ExecuteReader();
        if (!r.Read()) return null;
        return new
        {
            model = r.GetString(0),
            supportsDominant = r.GetInt32(1) == 1,
            supportsDual = r.GetInt32(2) == 1,
            supportsComposite = r.GetInt32(3) == 1,
            supportsDormant = r.GetInt32(4) == 1,
            supportsAncestral = r.GetInt32(5) == 1,
            supportsMultiple = r.GetInt32(6) == 1,
            regionalVariants = ParseStringMap(r.GetString(7)),
            hereditaryRestrictions = r.IsDBNull(8) ? "" : r.GetString(8),
            pureNetherCapPct = r.IsDBNull(9) ? (double?)null : r.GetDouble(9),
            notes = r.IsDBNull(10) ? "" : r.GetString(10),
        };
    }

    private static List<object> LoadHabitats(SqliteConnection db, string sid)
    {
        var list = new List<object>();
        using var cmd = db.CreateCommand();
        cmd.CommandText = """
            SELECT realm, habitat_summary, biome_tags_json, is_native, domestication_status,
                   ecological_role, conservation_status, migration_pattern
            FROM SpeciesHabitats WHERE species_id = $id
            """;
        cmd.Parameters.AddWithValue("$id", sid);
        using var r = cmd.ExecuteReader();
        while (r.Read())
        {
            list.Add(new
            {
                realm = r.GetString(0),
                summary = r.GetString(1),
                biomes = ParseStringList(r.GetString(2)),
                isNative = r.GetInt32(3) == 1,
                domesticationStatus = r.IsDBNull(4) ? null : r.GetString(4),
                ecologicalRole = r.IsDBNull(5) ? null : r.GetString(5),
                conservationStatus = r.IsDBNull(6) ? null : r.GetString(6),
                migrationPattern = r.IsDBNull(7) ? null : r.GetString(7),
            });
        }
        return list;
    }

    private static List<object> LoadReferences(SqliteConnection db, string sid)
    {
        var list = new List<object>();
        using var cmd = db.CreateCommand();
        cmd.CommandText = "SELECT title, url, source_type, verification_status FROM SpeciesReferences WHERE species_id = $id ORDER BY sort_order, id";
        cmd.Parameters.AddWithValue("$id", sid);
        using var r = cmd.ExecuteReader();
        while (r.Read())
        {
            list.Add(new
            {
                title = r.GetString(0),
                url = r.GetString(1),
                sourceType = r.GetString(2),
                verification = r.GetString(3),
            });
        }
        return list;
    }

    private static List<object> LoadSpeciesAssets(SqliteConnection db, string sid, string realm)
    {
        var list = new List<object>();
        using var cmd = db.CreateCommand();
        cmd.CommandText = """
            SELECT asset_id, species_id, realm, asset_kind, title, relative_path, mime_type
            FROM SpeciesAssets
            WHERE species_id = $id OR (species_id IS NULL AND realm = $realm)
            ORDER BY CASE WHEN species_id IS NOT NULL THEN 0 ELSE 1 END, asset_kind
            """;
        cmd.Parameters.AddWithValue("$id", sid);
        cmd.Parameters.AddWithValue("$realm", realm);
        using var r = cmd.ExecuteReader();
        while (r.Read())
        {
            list.Add(new
            {
                assetId = r.GetString(0),
                speciesId = r.IsDBNull(1) ? null : r.GetString(1),
                realm = r.IsDBNull(2) ? null : r.GetString(2),
                kind = r.GetString(3),
                title = r.GetString(4),
                url = r.GetString(5),
                mimeType = r.GetString(6),
            });
        }
        return list;
    }

    private static List<object> LoadRelated(SqliteConnection db, string sid, string familyId, string realm, string category)
    {
        var list = new List<object>();
        using var cmd = db.CreateCommand();
        cmd.CommandText = """
            SELECT id, name, slug, realm, category, family_name, classification_type, affinity
            FROM Species
            WHERE id <> $id AND (family_id = $fam OR (realm = $realm AND category = $cat))
            ORDER BY CASE WHEN family_id = $fam THEN 0 ELSE 1 END, id
            LIMIT 12
            """;
        cmd.Parameters.AddWithValue("$id", sid);
        cmd.Parameters.AddWithValue("$fam", familyId);
        cmd.Parameters.AddWithValue("$realm", realm);
        cmd.Parameters.AddWithValue("$cat", category);
        using var r = cmd.ExecuteReader();
        while (r.Read())
        {
            list.Add(new
            {
                id = r.GetString(0),
                name = r.GetString(1),
                slug = r.GetString(2),
                realm = r.GetString(3),
                category = r.GetString(4),
                family = r.GetString(5),
                classificationType = r.GetString(6),
                affinity = r.GetString(7),
            });
        }
        return list;
    }

    private async Task HandleGetSpeciesAbilities(HttpListenerResponse response, string idOrSlug)
    {
        using var db = OpenReadOnly();
        var sid = ResolveSpeciesId(db, idOrSlug);
        if (sid == null)
        {
            await WorldSaveApi.Reply(response, 404, new { error = $"Species record not found: {idOrSlug}" });
            return;
        }
        var abilities = LoadAbilities(db, sid);
        var inheritance = LoadInheritance(db, sid);
        await WorldSaveApi.Reply(response, 200, new { speciesId = sid, abilities, inheritance });
    }

    private async Task HandleGetRelatedSpecies(HttpListenerResponse response, string idOrSlug)
    {
        using var db = OpenReadOnly();
        var sid = ResolveSpeciesId(db, idOrSlug);
        if (sid == null)
        {
            await WorldSaveApi.Reply(response, 404, new { error = $"Species record not found: {idOrSlug}" });
            return;
        }
        using var cmd = db.CreateCommand();
        cmd.CommandText = "SELECT family_id, realm, category FROM Species WHERE id = $id";
        cmd.Parameters.AddWithValue("$id", sid);
        using var r = cmd.ExecuteReader();
        r.Read();
        var related = LoadRelated(db, sid, r.GetString(0), r.GetString(1), r.GetString(2));
        await WorldSaveApi.Reply(response, 200, new { speciesId = sid, related });
    }

    private async Task HandleCelestial(HttpListenerResponse response)
    {
        using var db = OpenReadOnly();
        var choirs = new List<object>();
        using (var cmd = db.CreateCommand())
        {
            cmd.CommandText = """
                SELECT c.species_id, c.choir_name, c.sphere, c.sphere_order, c.affinity, c.description, c.separate_from_ancestry
                FROM AngelicChoirs c
                ORDER BY c.sphere_order, c.species_id
                """;
            using var r = cmd.ExecuteReader();
            while (r.Read())
            {
                choirs.Add(new
                {
                    speciesId = r.GetString(0),
                    name = r.GetString(1),
                    sphere = r.GetString(2),
                    sphereOrder = r.GetInt32(3),
                    affinity = r.GetString(4),
                    description = r.GetString(5),
                    separateFromAncestry = r.GetInt32(6) == 1,
                });
            }
        }

        var celestialBeings = new List<object>();
        using (var cmd = db.CreateCommand())
        {
            cmd.CommandText = """
                SELECT id, name, realm, family_name, classification_type, affinity, description
                FROM Species
                WHERE classification_type IN ('celestial_being', 'hybrid_ancestry')
                ORDER BY classification_type, id
                """;
            using var r = cmd.ExecuteReader();
            while (r.Read())
            {
                celestialBeings.Add(new
                {
                    id = r.GetString(0),
                    name = r.GetString(1),
                    realm = r.GetString(2),
                    family = r.GetString(3),
                    classificationType = r.GetString(4),
                    affinity = r.GetString(5),
                    description = r.GetString(6),
                });
            }
        }

        await WorldSaveApi.Reply(response, 200, new
        {
            note = "Angelic choirs are separate from biological ancestry, royal dynasties, and ancient ancestral Houses.",
            choirs,
            celestialAndHybridLineages = celestialBeings,
        });
    }

    private async Task HandleDisciplines(HttpListenerResponse response)
    {
        using var db = OpenReadOnly();

        var practitioners = new List<object>();
        using (var cmd = db.CreateCommand())
        {
            cmd.CommandText = """
                SELECT species_id, name, discipline_id, gender_restriction, species_restriction, description
                FROM PractitionerTypes ORDER BY species_id
                """;
            using var r = cmd.ExecuteReader();
            while (r.Read())
            {
                practitioners.Add(new
                {
                    speciesId = r.GetString(0),
                    name = r.GetString(1),
                    disciplineId = r.IsDBNull(2) ? null : r.GetString(2),
                    genderRestriction = r.IsDBNull(3) ? null : r.GetString(3),
                    speciesRestriction = r.IsDBNull(4) ? null : r.GetString(4),
                    description = r.GetString(5),
                });
            }
        }

        var witchTraditions = new List<object>();
        using (var cmd = db.CreateCommand())
        {
            cmd.CommandText = """
                SELECT species_id, tradition_name, realm, affinity, witchkind_exclusive, description
                FROM WitchTraditions ORDER BY species_id
                """;
            using var r = cmd.ExecuteReader();
            while (r.Read())
            {
                witchTraditions.Add(new
                {
                    speciesId = r.GetString(0),
                    name = r.GetString(1),
                    realm = r.GetString(2),
                    affinity = r.GetString(3),
                    witchkindExclusive = r.GetInt32(4) == 1,
                    description = r.GetString(5),
                });
            }
        }

        var statuses = new List<object>();
        using (var cmd = db.CreateCommand())
        {
            cmd.CommandText = """
                SELECT species_id, status_name, attainment_kind, auto_assign_allowed, description
                FROM SupernaturalStatuses ORDER BY species_id
                """;
            using var r = cmd.ExecuteReader();
            while (r.Read())
            {
                statuses.Add(new
                {
                    speciesId = r.GetString(0),
                    name = r.GetString(1),
                    attainmentKind = r.GetString(2),
                    autoAssignAllowed = r.GetInt32(3) == 1,
                    description = r.GetString(4),
                });
            }
        }

        await WorldSaveApi.Reply(response, 200, new
        {
            witchcraftRule = "Witchcraft is exclusive to Witchkind. Other species may learn general magic and other magical crafts. Warlocks are male practitioners of the Dark Arts or Black Magic, not a separate biological species.",
            practitioners,
            witchTraditions,
            supernaturalStatuses = statuses,
        });
    }

    private async Task HandleWildlife(HttpListenerRequest request, HttpListenerResponse response)
    {
        var realm = request.QueryString["realm"]?.Trim() ?? "";
        var faunaClass = request.QueryString["faunaClass"]?.Trim() ?? "";
        var transportOnly = string.Equals(request.QueryString["transportOnly"], "true", StringComparison.OrdinalIgnoreCase);

        using var db = OpenReadOnly();
        var clauses = new List<string>();
        var parameters = new List<(string, object)>();
        if (!string.IsNullOrEmpty(realm))
        {
            clauses.Add("lower(w.realm) = lower($realm)");
            parameters.Add(("$realm", realm));
        }
        if (!string.IsNullOrEmpty(faunaClass))
        {
            clauses.Add("lower(w.fauna_class) = lower($faunaClass)");
            parameters.Add(("$faunaClass", faunaClass));
        }
        if (transportOnly)
        {
            clauses.Add("w.transport_capable = 1");
        }
        var whereSql = clauses.Count > 0 ? "WHERE " + string.Join(" AND ", clauses) : "";

        var populations = new List<object>();
        using var cmd = db.CreateCommand();
        cmd.CommandText = $"""
            SELECT w.population_id, w.species_id, s.name, s.family_name, s.affinity,
                   w.realm, w.habitat_zone, w.fauna_class, w.ecological_role,
                   w.domestication_status, w.transport_capable, w.companion_capable,
                   w.familiar_capable, w.working_capable, w.estimated_population,
                   w.conservation_status, w.migration_status
            FROM WildlifePopulations w
            JOIN Species s ON s.id = w.species_id
            {whereSql}
            ORDER BY w.realm, s.name
            """;
        foreach (var (k, v) in parameters) cmd.Parameters.AddWithValue(k, v);
        using var r = cmd.ExecuteReader();
        while (r.Read())
        {
            populations.Add(new
            {
                populationId = r.GetString(0),
                speciesId = r.GetString(1),
                name = r.GetString(2),
                family = r.GetString(3),
                affinity = r.GetString(4),
                realm = r.GetString(5),
                habitatZone = r.GetString(6),
                faunaClass = r.GetString(7),
                ecologicalRole = r.GetString(8),
                domesticationStatus = r.GetString(9),
                transportCapable = r.GetInt32(10) == 1,
                companionCapable = r.GetInt32(11) == 1,
                familiarCapable = r.GetInt32(12) == 1,
                workingCapable = r.GetInt32(13) == 1,
                estimatedPopulation = r.GetInt64(14),
                conservationStatus = r.GetString(15),
                migrationStatus = r.GetString(16),
            });
        }

        await WorldSaveApi.Reply(response, 200, new
        {
            count = populations.Count,
            populations,
        });
    }

    private async Task HandleAssets(HttpListenerResponse response)
    {
        using var db = OpenReadOnly();
        var assets = LoadAllAssets(db);
        await WorldSaveApi.Reply(response, 200, new { count = assets.Count, assets });
    }

    private async Task HandleValidateCharacter(HttpListenerRequest request, HttpListenerResponse response)
    {
        using var reader = new StreamReader(request.InputStream, request.ContentEncoding);
        var body = await reader.ReadToEndAsync();
        if (string.IsNullOrWhiteSpace(body))
        {
            await WorldSaveApi.Reply(response, 400, new { valid = false, errors = new[] { "Request body is required." } });
            return;
        }

        using var doc = JsonDocument.Parse(body);
        var root = doc.RootElement;
        string? GetStr(string prop) => root.TryGetProperty(prop, out var v) && v.ValueKind == JsonValueKind.String ? v.GetString()?.Trim() : null;

        var speciesKey = GetStr("speciesId") ?? GetStr("species");
        var practiceKey = GetStr("practice") ?? GetStr("magicalSpecialization");
        var gender = GetStr("gender");
        var choirKey = GetStr("angelicChoirId") ?? GetStr("angelicChoir");
        var statusKey = GetStr("supernaturalStatus");
        var nativeRealm = GetStr("nativeRealm");

        var errors = new List<string>();
        var warnings = new List<string>();

        using var db = OpenReadOnly();
        string? resolvedSpeciesName = null;
        string? resolvedClassification = null;

        if (!string.IsNullOrWhiteSpace(speciesKey))
        {
            var sid = ResolveSpeciesId(db, speciesKey);
            if (sid == null)
            {
                errors.Add($"Unknown species identifier: '{speciesKey}'.");
            }
            else
            {
                using var cmd = db.CreateCommand();
                cmd.CommandText = "SELECT name, classification_type, is_sapient, is_playable_lineage FROM Species WHERE id = $id";
                cmd.Parameters.AddWithValue("$id", sid);
                using var r = cmd.ExecuteReader();
                if (r.Read())
                {
                    resolvedSpeciesName = r.GetString(0);
                    resolvedClassification = r.GetString(1);
                    var isSapient = r.GetInt32(2) == 1;
                    if (resolvedClassification is "magical_practitioner" or "witchcraft_tradition" or "supernatural_status" or "angelic_choir")
                    {
                        errors.Add($"'{resolvedSpeciesName}' is classified as '{resolvedClassification}', not a biological species or ancestry. Assign it in the appropriate specialization, choir, or status field.");
                    }
                    else if (!isSapient)
                    {
                        warnings.Add($"'{resolvedSpeciesName}' is classified as fauna ('{resolvedClassification}'), not a sapient character species.");
                    }
                }
            }
        }

        if (!string.IsNullOrWhiteSpace(practiceKey))
        {
            var pid = ResolveSpeciesId(db, practiceKey);
            if (pid != null)
            {
                using var cmd = db.CreateCommand();
                cmd.CommandText = "SELECT name, classification_type FROM Species WHERE id = $id";
                cmd.Parameters.AddWithValue("$id", pid);
                using var r = cmd.ExecuteReader();
                if (r.Read())
                {
                    var pname = r.GetString(0);
                    var pclass = r.GetString(1);
                    if ((pclass == "witchcraft_tradition" || pname.Equals("Witch", StringComparison.OrdinalIgnoreCase))
                        && !string.Equals(resolvedSpeciesName, "Witchkind", StringComparison.OrdinalIgnoreCase))
                    {
                        errors.Add($"Witchcraft ('{pname}') is exclusive to Witchkind. Other species may learn general magic and other magical crafts.");
                    }
                    if (pname.Equals("Warlock", StringComparison.OrdinalIgnoreCase)
                        && !string.IsNullOrWhiteSpace(gender)
                        && !gender.Equals("Male", StringComparison.OrdinalIgnoreCase))
                    {
                        warnings.Add("In Meridion canon, Warlocks are male practitioners of the Dark Arts or Black Magic.");
                    }
                }
            }
        }

        if (!string.IsNullOrWhiteSpace(statusKey))
        {
            if (statusKey.Equals("Immortal", StringComparison.OrdinalIgnoreCase) || statusKey.Equals("Saint", StringComparison.OrdinalIgnoreCase))
            {
                warnings.Add($"'{statusKey}' is an attained existential status and must not be automatically assigned during generation.");
            }
        }

        if (!string.IsNullOrWhiteSpace(choirKey))
        {
            using var cmd = db.CreateCommand();
            cmd.CommandText = "SELECT choir_name FROM AngelicChoirs WHERE lower(species_id) = lower($k) OR lower(choir_name) = lower($k)";
            cmd.Parameters.AddWithValue("$k", choirKey);
            if (cmd.ExecuteScalar() == null)
            {
                errors.Add($"Unknown Angelic Choir: '{choirKey}'.");
            }
        }

        if (!string.IsNullOrWhiteSpace(nativeRealm) && !ValidRealms.Contains(nativeRealm))
        {
            warnings.Add($"Unrecognized realm '{nativeRealm}'. Canonical realms are Orynvell, Fross, Lumia, Marlowe, Brisland, Kaji, Nephele, and Ve’Raylia.");
        }

        await WorldSaveApi.Reply(response, errors.Count == 0 ? 200 : 422, new
        {
            valid = errors.Count == 0,
            resolvedSpecies = resolvedSpeciesName,
            resolvedClassification,
            errors,
            warnings,
        });
    }

    private async Task HandleListCharacterReviews(HttpListenerResponse response)
    {
        using var db = OpenReadOnly();
        var items = new List<object>();
        using var cmd = db.CreateCommand();
        cmd.CommandText = """
            SELECT c.CharacterId, c.Name, c.Title, c.Occupation, c.HomeRealm, c.Maid, c.Kind,
                   p.species_id, s.name AS species_name, p.subspecies_id,
                   p.biological_ancestry_json, p.mixed_ancestry_json,
                   p.native_realm, p.citizenship, p.primary_affinity,
                   p.regional_lineage, p.magical_specializations_json,
                   p.angelic_choir_id, p.supernatural_statuses_json,
                   COALESCE(p.classification_review_needed, 1) AS review_needed,
                   p.review_notes, p.updated_at
            FROM Characters c
            LEFT JOIN CharacterSpeciesProfiles p ON p.character_id = c.CharacterId
            LEFT JOIN Species s ON s.id = p.species_id
            ORDER BY COALESCE(p.classification_review_needed, 1) DESC, COALESCE(c.HomeRealm, 'ZZZ'), c.Name
            """;
        using var r = cmd.ExecuteReader();
        while (r.Read())
        {
            items.Add(new
            {
                characterId = r.GetString(0),
                name = r.GetString(1),
                title = r.IsDBNull(2) ? null : r.GetString(2),
                occupation = r.IsDBNull(3) ? null : r.GetString(3),
                homeRealm = r.IsDBNull(4) ? null : r.GetString(4),
                maid = r.IsDBNull(5) ? null : r.GetString(5),
                kind = r.GetString(6),
                speciesId = r.IsDBNull(7) ? null : r.GetString(7),
                speciesName = r.IsDBNull(8) ? null : r.GetString(8),
                subspeciesId = r.IsDBNull(9) ? null : r.GetString(9),
                biologicalAncestry = ParseStringList(r.IsDBNull(10) ? null : r.GetString(10)),
                mixedAncestry = ParseStringList(r.IsDBNull(11) ? null : r.GetString(11)),
                nativeRealm = r.IsDBNull(12) ? null : r.GetString(12),
                citizenship = r.IsDBNull(13) ? null : r.GetString(13),
                primaryAffinity = r.IsDBNull(14) ? null : r.GetString(14),
                regionalLineage = r.IsDBNull(15) ? null : r.GetString(15),
                magicalSpecializations = ParseStringList(r.IsDBNull(16) ? null : r.GetString(16)),
                angelicChoirId = r.IsDBNull(17) ? null : r.GetString(17),
                supernaturalStatuses = ParseStringList(r.IsDBNull(18) ? null : r.GetString(18)),
                classificationReviewNeeded = r.GetInt32(19) == 1,
                reviewNotes = r.IsDBNull(20) ? null : r.GetString(20),
                updatedAt = r.IsDBNull(21) ? null : r.GetString(21),
            });
        }

        await WorldSaveApi.Reply(response, 200, new
        {
            total = items.Count,
            flaggedCount = items.Count(i => (bool)i.GetType().GetProperty("classificationReviewNeeded")!.GetValue(i)!),
            characters = items,
        });
    }

    private async Task HandleSaveCharacterReview(HttpListenerRequest request, HttpListenerResponse response, string charId)
    {
        if (string.IsNullOrWhiteSpace(charId))
        {
            await WorldSaveApi.Reply(response, 400, new { error = "characterId is required." });
            return;
        }
        using var reader = new StreamReader(request.InputStream, request.ContentEncoding);
        var body = await reader.ReadToEndAsync();
        if (string.IsNullOrWhiteSpace(body))
        {
            await WorldSaveApi.Reply(response, 400, new { error = "Request body is required." });
            return;
        }

        using var doc = JsonDocument.Parse(body);
        var root = doc.RootElement;
        string? GetStr(string prop) => root.TryGetProperty(prop, out var v) && v.ValueKind == JsonValueKind.String ? v.GetString()?.Trim() : null;
        List<string> GetStrList(string prop)
        {
            var list = new List<string>();
            if (root.TryGetProperty(prop, out var arr) && arr.ValueKind == JsonValueKind.Array)
            {
                foreach (var el in arr.EnumerateArray())
                {
                    if (el.ValueKind == JsonValueKind.String && !string.IsNullOrWhiteSpace(el.GetString()))
                        list.Add(el.GetString()!.Trim());
                }
            }
            return list;
        }

        var speciesKey = GetStr("speciesId");
        var primaryAffinity = GetStr("primaryAffinity");
        var regionalLineage = GetStr("regionalLineage");
        var nativeRealm = GetStr("nativeRealm");
        var angelicChoirId = GetStr("angelicChoirId");
        var reviewNotes = GetStr("reviewNotes");
        var specializations = GetStrList("magicalSpecializations");
        var statuses = GetStrList("supernaturalStatuses");
        var mixedAncestry = GetStrList("mixedAncestry");
        var markReviewed = !root.TryGetProperty("classificationReviewNeeded", out var flagEl) || flagEl.ValueKind != JsonValueKind.True;

        using var db = OpenReadWrite();

        // Confirm character exists in Characters
        string? homeRealm = null;
        using (var check = db.CreateCommand())
        {
            check.CommandText = "SELECT HomeRealm FROM Characters WHERE CharacterId = $id";
            check.Parameters.AddWithValue("$id", charId);
            var hr = check.ExecuteScalar();
            if (hr == null)
            {
                await WorldSaveApi.Reply(response, 404, new { error = $"Canonical character not found: {charId}" });
                return;
            }
            homeRealm = hr == DBNull.Value ? null : Convert.ToString(hr);
        }

        string? resolvedSpeciesId = null;
        string? resolvedSpeciesName = null;
        if (!string.IsNullOrWhiteSpace(speciesKey))
        {
            resolvedSpeciesId = ResolveSpeciesId(db, speciesKey);
            if (resolvedSpeciesId == null)
            {
                await WorldSaveApi.Reply(response, 422, new { error = $"Unknown species ID: '{speciesKey}'." });
                return;
            }
            using var scmd = db.CreateCommand();
            scmd.CommandText = "SELECT name, classification_type FROM Species WHERE id = $id";
            scmd.Parameters.AddWithValue("$id", resolvedSpeciesId);
            using var sr = scmd.ExecuteReader();
            if (sr.Read())
            {
                resolvedSpeciesName = sr.GetString(0);
                var ctype = sr.GetString(1);
                if (ctype is "magical_practitioner" or "witchcraft_tradition" or "supernatural_status" or "angelic_choir")
                {
                    await WorldSaveApi.Reply(response, 422, new
                    {
                        error = $"'{resolvedSpeciesName}' is classified as '{ctype}', not a biological species or lineage."
                    });
                    return;
                }
            }
        }

        // Enforce Witchcraft exclusivity to Witchkind
        foreach (var spec in specializations)
        {
            var pid = ResolveSpeciesId(db, spec);
            if (pid != null)
            {
                using var pcmd = db.CreateCommand();
                pcmd.CommandText = "SELECT name, classification_type FROM Species WHERE id = $id";
                pcmd.Parameters.AddWithValue("$id", pid);
                using var pr = pcmd.ExecuteReader();
                if (pr.Read())
                {
                    var pname = pr.GetString(0);
                    var ptype = pr.GetString(1);
                    if ((ptype == "witchcraft_tradition" || pname.Equals("Witch", StringComparison.OrdinalIgnoreCase))
                        && !string.Equals(resolvedSpeciesName, "Witchkind", StringComparison.OrdinalIgnoreCase))
                    {
                        await WorldSaveApi.Reply(response, 422, new
                        {
                            error = $"Witchcraft ('{pname}') is exclusive to Witchkind."
                        });
                        return;
                    }
                }
            }
        }

        string? resolvedChoirId = null;
        if (!string.IsNullOrWhiteSpace(angelicChoirId))
        {
            using var ccmd = db.CreateCommand();
            ccmd.CommandText = "SELECT species_id FROM AngelicChoirs WHERE lower(species_id) = lower($k) OR lower(choir_name) = lower($k)";
            ccmd.Parameters.AddWithValue("$k", angelicChoirId);
            var cid = ccmd.ExecuteScalar();
            if (cid == null || cid == DBNull.Value)
            {
                await WorldSaveApi.Reply(response, 422, new { error = $"Unknown Angelic Choir: '{angelicChoirId}'." });
                return;
            }
            resolvedChoirId = Convert.ToString(cid);
        }

        var now = DateTimeOffset.UtcNow.ToString("O");
        using var tx = db.BeginTransaction();
        using (var up = db.CreateCommand())
        {
            up.Transaction = tx;
            up.CommandText = """
                INSERT INTO CharacterSpeciesProfiles (
                    character_id, character_source, species_id, subspecies_id,
                    biological_ancestry_json, mixed_ancestry_json,
                    native_realm, citizenship, primary_affinity,
                    regional_lineage, magical_specializations_json,
                    angelic_choir_id, supernatural_statuses_json,
                    classification_review_needed, review_notes, updated_at
                ) VALUES (
                    $cid, 'canonical', $sid, NULL,
                    $bio, $mix,
                    $realm, $realm, $aff,
                    $reg, $specs,
                    $choir, $statuses,
                    $needsReview, $notes, $now
                )
                ON CONFLICT(character_id) DO UPDATE SET
                    species_id = excluded.species_id,
                    biological_ancestry_json = excluded.biological_ancestry_json,
                    mixed_ancestry_json = excluded.mixed_ancestry_json,
                    native_realm = COALESCE(excluded.native_realm, native_realm),
                    primary_affinity = excluded.primary_affinity,
                    regional_lineage = excluded.regional_lineage,
                    magical_specializations_json = excluded.magical_specializations_json,
                    angelic_choir_id = excluded.angelic_choir_id,
                    supernatural_statuses_json = excluded.supernatural_statuses_json,
                    classification_review_needed = excluded.classification_review_needed,
                    review_notes = excluded.review_notes,
                    updated_at = excluded.updated_at
                """;
            up.Parameters.AddWithValue("$cid", charId);
            up.Parameters.AddWithValue("$sid", (object?)resolvedSpeciesId ?? DBNull.Value);
            up.Parameters.AddWithValue("$bio", JsonSerializer.Serialize(resolvedSpeciesName != null ? new[] { $"{resolvedSpeciesName} ({resolvedSpeciesId})" } : Array.Empty<string>()));
            up.Parameters.AddWithValue("$mix", JsonSerializer.Serialize(mixedAncestry));
            up.Parameters.AddWithValue("$realm", (object?)(nativeRealm ?? homeRealm) ?? DBNull.Value);
            up.Parameters.AddWithValue("$aff", (object?)primaryAffinity ?? DBNull.Value);
            up.Parameters.AddWithValue("$reg", (object?)regionalLineage ?? DBNull.Value);
            up.Parameters.AddWithValue("$specs", JsonSerializer.Serialize(specializations));
            up.Parameters.AddWithValue("$choir", (object?)resolvedChoirId ?? DBNull.Value);
            up.Parameters.AddWithValue("$statuses", JsonSerializer.Serialize(statuses));
            up.Parameters.AddWithValue("$needsReview", markReviewed ? 0 : 1);
            up.Parameters.AddWithValue("$notes", (object?)reviewNotes ?? DBNull.Value);
            up.Parameters.AddWithValue("$now", now);
            up.ExecuteNonQuery();
        }
        tx.Commit();

        await WorldSaveApi.Reply(response, 200, new
        {
            saved = true,
            characterId = charId,
            speciesId = resolvedSpeciesId,
            speciesName = resolvedSpeciesName,
            classificationReviewNeeded = !markReviewed,
            updatedAt = now,
        });
    }
}
