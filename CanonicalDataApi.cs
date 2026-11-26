using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Net;
using System.Text.Json;
using System.Text.RegularExpressions;
using System.Threading.Tasks;
using Microsoft.Data.Sqlite;

namespace MiraverseOSx;

/// <summary>
/// Authoritative backend endpoints backed by miraverse.db for canonical Characters,
/// MAID registry/allocation across all 8 realms, Careers, Missions, and Organizations.
/// Uses parameterized SQL and transactional writes so the browser never allocates
/// canonical identifiers independently when connected.
/// </summary>
internal sealed class CanonicalDataApi
{
    private const string Prefix = "api/canonical/";
    private readonly string dbPath;

    private static readonly Regex MaidRegex = new(@"^MAID-(OR|FR|LU|MA|BR|KA|NE|VR)-(\d{8})$", RegexOptions.Compiled);

    private static readonly Dictionary<string, (string Code, string Name)> RegionCatalog = new(StringComparer.OrdinalIgnoreCase)
    {
        ["OR"] = ("OR", "Orynvell"),
        ["Orynvell"] = ("OR", "Orynvell"),
        ["FR"] = ("FR", "Fross"),
        ["Fross"] = ("FR", "Fross"),
        ["LU"] = ("LU", "Lumia"),
        ["Lumia"] = ("LU", "Lumia"),
        ["MA"] = ("MA", "Marlowe"),
        ["Marlowe"] = ("MA", "Marlowe"),
        ["BR"] = ("BR", "Brisland"),
        ["Brisland"] = ("BR", "Brisland"),
        ["KA"] = ("KA", "Kaji"),
        ["Kaji"] = ("KA", "Kaji"),
        ["NE"] = ("NE", "Nephele"),
        ["Nephele"] = ("NE", "Nephele"),
        ["VR"] = ("VR", "Ve’Raylia"),
        ["Ve'Raylia"] = ("VR", "Ve’Raylia"),
        ["Ve’Raylia"] = ("VR", "Ve’Raylia"),
        ["VeRaylia"] = ("VR", "Ve’Raylia"),
    };

    private static readonly string[] ValidRegionCodes = { "OR", "FR", "LU", "MA", "BR", "KA", "NE", "VR" };

    public CanonicalDataApi()
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

    public static bool TryResolveRegionCode(string? input, out string regionCode)
    {
        regionCode = "";
        if (string.IsNullOrWhiteSpace(input)) return false;
        if (RegionCatalog.TryGetValue(input.Trim(), out var entry))
        {
            regionCode = entry.Code;
            return true;
        }
        return false;
    }

    public async Task<bool> Handle(HttpListenerContext context, string path)
    {
        if (!path.StartsWith(Prefix, StringComparison.OrdinalIgnoreCase)) return false;
        var request = context.Request;
        var response = context.Response;
        response.Headers["Cache-Control"] = "no-store";

        if (!request.IsLocal)
        {
            await WorldSaveApi.Reply(response, 403, new { error = "Local access only." });
            return true;
        }

        var route = path[Prefix.Length..].Trim('/');
        try
        {
            if (request.HttpMethod == "GET" && route.Equals("summary", StringComparison.OrdinalIgnoreCase))
            {
                await HandleSummary(response);
                return true;
            }
            if (request.HttpMethod == "GET" && route.Equals("characters", StringComparison.OrdinalIgnoreCase))
            {
                await HandleListCharacters(response);
                return true;
            }
            if (route.StartsWith("characters/", StringComparison.OrdinalIgnoreCase))
            {
                var charId = Uri.UnescapeDataString(route["characters/".Length..]).Trim('/');
                if (request.HttpMethod == "GET")
                {
                    await HandleGetCharacter(response, charId);
                    return true;
                }
                if (request.HttpMethod == "PUT" || request.HttpMethod == "PATCH")
                {
                    await HandleUpdateCharacter(request, response, charId);
                    return true;
                }
            }
            if (request.HttpMethod == "GET" && route.Equals("maids", StringComparison.OrdinalIgnoreCase))
            {
                await HandleListMaids(response);
                return true;
            }
            if (request.HttpMethod == "POST" && route.Equals("maids/allocate", StringComparison.OrdinalIgnoreCase))
            {
                await HandleAllocateMaid(request, response);
                return true;
            }
            if (request.HttpMethod == "POST" && route.Equals("maids/validate", StringComparison.OrdinalIgnoreCase))
            {
                await HandleValidateMaid(request, response);
                return true;
            }
            if (request.HttpMethod == "GET" && route.Equals("careers", StringComparison.OrdinalIgnoreCase))
            {
                await HandleListCareers(response);
                return true;
            }
            if (request.HttpMethod == "GET" && route.Equals("missions", StringComparison.OrdinalIgnoreCase))
            {
                await HandleListMissions(response);
                return true;
            }
            if (request.HttpMethod == "GET" && route.Equals("organizations", StringComparison.OrdinalIgnoreCase))
            {
                await HandleListOrganizations(response);
                return true;
            }

            await WorldSaveApi.Reply(response, 404, new { error = $"Unknown canonical API route: {route}" });
            return true;
        }
        catch (SqliteException ex) when (ex.SqliteErrorCode == 19)
        {
            await WorldSaveApi.Reply(response, 409, new { error = $"Database constraint violation: {ex.Message}" });
            return true;
        }
        catch (Exception ex)
        {
            await WorldSaveApi.Reply(response, 500, new { error = ex.Message });
            return true;
        }
    }

    private async Task HandleSummary(HttpListenerResponse response)
    {
        using var db = OpenReadOnly();
        var counts = new Dictionary<string, long>();
        foreach (var table in new[]
        {
            "Characters", "RetiredCharacters", "MaidRegistry", "MaidRetiredSerials",
            "Careers", "CareerProgression", "Missions", "MissionCatalogMeta",
            "EntertainmentOrganizations", "CharacterProfiles", "LivingWorldRuns", "LivingWorldTransactions"
        })
        {
            try
            {
                using var cmd = db.CreateCommand();
                cmd.CommandText = $"SELECT COUNT(*) FROM \"{table}\"";
                counts[table] = Convert.ToInt64(cmd.ExecuteScalar());
            }
            catch
            {
                counts[table] = -1;
            }
        }
        await WorldSaveApi.Reply(response, 200, new
        {
            database = Path.GetFileName(dbPath),
            counts,
            authorizedRegionCodes = ValidRegionCodes,
        });
    }

    private static List<string> ParseJsonStringArray(string? raw)
    {
        if (string.IsNullOrWhiteSpace(raw)) return new List<string>();
        try
        {
            return JsonSerializer.Deserialize<List<string>>(raw) ?? new List<string>();
        }
        catch
        {
            return new List<string>();
        }
    }

    private static List<int> ParseJsonIntArray(string? raw)
    {
        if (string.IsNullOrWhiteSpace(raw)) return new List<int>();
        try
        {
            return JsonSerializer.Deserialize<List<int>>(raw) ?? new List<int>();
        }
        catch
        {
            return new List<int>();
        }
    }

    private static Dictionary<string, List<string>> LoadAliasesByCharacter(SqliteConnection db)
    {
        var map = new Dictionary<string, List<string>>(StringComparer.Ordinal);
        using var cmd = db.CreateCommand();
        cmd.CommandText = "SELECT CharacterId, Alias FROM CharacterAliases ORDER BY CharacterId, Position";
        using var reader = cmd.ExecuteReader();
        while (reader.Read())
        {
            var cid = reader.GetString(0);
            if (!map.TryGetValue(cid, out var list))
            {
                list = new List<string>();
                map[cid] = list;
            }
            list.Add(reader.GetString(1));
        }
        return map;
    }

    private static Dictionary<string, List<string>> LoadLegacyIdsByCharacter(SqliteConnection db)
    {
        var map = new Dictionary<string, List<string>>(StringComparer.Ordinal);
        using var cmd = db.CreateCommand();
        cmd.CommandText = "SELECT CharacterId, LegacyId FROM CharacterLegacyIds ORDER BY CharacterId, Position";
        using var reader = cmd.ExecuteReader();
        while (reader.Read())
        {
            var cid = reader.GetString(0);
            if (!map.TryGetValue(cid, out var list))
            {
                list = new List<string>();
                map[cid] = list;
            }
            list.Add(reader.GetString(1));
        }
        return map;
    }

    private async Task HandleListCharacters(HttpListenerResponse response)
    {
        using var db = OpenReadOnly();
        var aliases = LoadAliasesByCharacter(db);
        var legacyIds = LoadLegacyIdsByCharacter(db);
        var characters = new List<object>();

        using (var cmd = db.CreateCommand())
        {
            cmd.CommandText = """
                SELECT CharacterId, Name, FirstName, LastName, Title, Occupation, HomeRealm,
                       Kind, Status, Maid, Folder, ProfileCount, NotesJson
                FROM BrowseCharacters
                ORDER BY Name
                """;
            using var reader = cmd.ExecuteReader();
            while (reader.Read())
            {
                var cid = reader.GetString(0);
                characters.Add(new
                {
                    characterId = cid,
                    name = reader.GetString(1),
                    firstName = reader.IsDBNull(2) ? null : reader.GetString(2),
                    lastName = reader.IsDBNull(3) ? null : reader.GetString(3),
                    title = reader.IsDBNull(4) ? null : reader.GetString(4),
                    occupation = reader.IsDBNull(5) ? null : reader.GetString(5),
                    homeRealm = reader.IsDBNull(6) ? null : reader.GetString(6),
                    kind = reader.GetString(7),
                    status = reader.GetString(8),
                    maid = reader.IsDBNull(9) ? null : reader.GetString(9),
                    folder = reader.GetString(10),
                    profileCount = reader.GetInt64(11),
                    notes = ParseJsonStringArray(reader.IsDBNull(12) ? null : reader.GetString(12)),
                    aliases = aliases.TryGetValue(cid, out var a) ? a : new List<string>(),
                    legacyIds = legacyIds.TryGetValue(cid, out var l) ? l : new List<string>(),
                });
            }
        }

        var retired = new List<object>();
        using (var rcmd = db.CreateCommand())
        {
            rcmd.CommandText = "SELECT CharacterId, Name, Folder, Reason, HistoricalContext, RetiredAt FROM RetiredCharacters ORDER BY CharacterId";
            using var r = rcmd.ExecuteReader();
            while (r.Read())
            {
                retired.Add(new
                {
                    characterId = r.GetString(0),
                    name = r.GetString(1),
                    folder = r.IsDBNull(2) ? null : r.GetString(2),
                    reason = r.GetString(3),
                    historicalContext = r.IsDBNull(4) ? null : r.GetString(4),
                    retiredAt = r.GetString(5),
                });
            }
        }

        await WorldSaveApi.Reply(response, 200, new
        {
            characters,
            retiredCharacters = retired,
            total = characters.Count,
        });
    }

    private async Task HandleGetCharacter(HttpListenerResponse response, string characterId)
    {
        using var db = OpenReadOnly();
        var aliases = LoadAliasesByCharacter(db);
        var legacyIds = LoadLegacyIdsByCharacter(db);

        using var cmd = db.CreateCommand();
        cmd.CommandText = """
            SELECT CharacterId, Name, FirstName, LastName, Title, Occupation, HomeRealm,
                   Kind, Status, Maid, Folder, ProfileCount, NotesJson
            FROM BrowseCharacters
            WHERE CharacterId = $id
            """;
        cmd.Parameters.AddWithValue("$id", characterId);
        using var reader = cmd.ExecuteReader();
        if (!reader.Read())
        {
            await WorldSaveApi.Reply(response, 404, new { error = $"Character '{characterId}' not found." });
            return;
        }
        var cid = reader.GetString(0);
        await WorldSaveApi.Reply(response, 200, new
        {
            characterId = cid,
            name = reader.GetString(1),
            firstName = reader.IsDBNull(2) ? null : reader.GetString(2),
            lastName = reader.IsDBNull(3) ? null : reader.GetString(3),
            title = reader.IsDBNull(4) ? null : reader.GetString(4),
            occupation = reader.IsDBNull(5) ? null : reader.GetString(5),
            homeRealm = reader.IsDBNull(6) ? null : reader.GetString(6),
            kind = reader.GetString(7),
            status = reader.GetString(8),
            maid = reader.IsDBNull(9) ? null : reader.GetString(9),
            folder = reader.GetString(10),
            profileCount = reader.GetInt64(11),
            notes = ParseJsonStringArray(reader.IsDBNull(12) ? null : reader.GetString(12)),
            aliases = aliases.TryGetValue(cid, out var a) ? a : new List<string>(),
            legacyIds = legacyIds.TryGetValue(cid, out var l) ? l : new List<string>(),
        });
    }

    private async Task HandleUpdateCharacter(HttpListenerRequest request, HttpListenerResponse response, string characterId)
    {
        using var reader = new StreamReader(request.InputStream, request.ContentEncoding);
        var rawBody = await reader.ReadToEndAsync();
        if (string.IsNullOrWhiteSpace(rawBody))
        {
            await WorldSaveApi.Reply(response, 400, new { error = "Empty JSON body." });
            return;
        }

        using var doc = JsonDocument.Parse(rawBody);
        var root = doc.RootElement;

        using var db = OpenReadWrite();
        using var tx = db.BeginTransaction();

        using (var retiredCheck = db.CreateCommand())
        {
            retiredCheck.Transaction = tx;
            retiredCheck.CommandText = "SELECT 1 FROM RetiredCharacters WHERE CharacterId = $id";
            retiredCheck.Parameters.AddWithValue("$id", characterId);
            if (retiredCheck.ExecuteScalar() != null)
            {
                await WorldSaveApi.Reply(response, 409, new { error = $"Character '{characterId}' is retired and cannot be modified." });
                return;
            }
        }

        string? existingName = null;
        string? existingFirst = null;
        string? existingLast = null;
        string? existingTitle = null;
        string? existingOccupation = null;
        string? existingHomeRealm = null;

        using (var fetch = db.CreateCommand())
        {
            fetch.Transaction = tx;
            fetch.CommandText = "SELECT Name, FirstName, LastName, Title, Occupation, HomeRealm FROM Characters WHERE CharacterId = $id";
            fetch.Parameters.AddWithValue("$id", characterId);
            using var r = fetch.ExecuteReader();
            if (!r.Read())
            {
                await WorldSaveApi.Reply(response, 404, new { error = $"Character '{characterId}' not found." });
                return;
            }
            existingName = r.GetString(0);
            existingFirst = r.IsDBNull(1) ? null : r.GetString(1);
            existingLast = r.IsDBNull(2) ? null : r.GetString(2);
            existingTitle = r.IsDBNull(3) ? null : r.GetString(3);
            existingOccupation = r.IsDBNull(4) ? null : r.GetString(4);
            existingHomeRealm = r.IsDBNull(5) ? null : r.GetString(5);
        }

        // Never allow changing immutable MAID via generic character profile update
        if (root.TryGetProperty("maid", out _))
        {
            await WorldSaveApi.Reply(response, 400, new { error = "MAID is immutable via profile update. Use /api/canonical/maids/allocate for initial issuance." });
            return;
        }

        string? ReadOpt(string prop, string? fallback)
        {
            if (!root.TryGetProperty(prop, out var el)) return fallback;
            if (el.ValueKind == JsonValueKind.Null) return null;
            var s = el.GetString()?.Trim();
            return string.IsNullOrEmpty(s) ? null : s;
        }

        var nextName = ReadOpt("name", existingName) ?? existingName!;
        var nextFirst = ReadOpt("firstName", existingFirst);
        var nextLast = ReadOpt("lastName", existingLast);
        var nextTitle = ReadOpt("title", existingTitle);
        var nextOccupation = ReadOpt("occupation", existingOccupation);
        var nextHomeRealm = ReadOpt("homeRealm", existingHomeRealm);

        if (nextHomeRealm != null && !TryResolveRegionCode(nextHomeRealm, out _))
        {
            await WorldSaveApi.Reply(response, 400, new { error = $"Unrecognized HomeRealm '{nextHomeRealm}'." });
            return;
        }

        using (var update = db.CreateCommand())
        {
            update.Transaction = tx;
            update.CommandText = """
                UPDATE Characters
                SET Name = $name,
                    FirstName = $first,
                    LastName = $last,
                    Title = $title,
                    Occupation = $occ,
                    HomeRealm = $realm
                WHERE CharacterId = $id
                """;
            update.Parameters.AddWithValue("$name", nextName);
            update.Parameters.AddWithValue("$first", (object?)nextFirst ?? DBNull.Value);
            update.Parameters.AddWithValue("$last", (object?)nextLast ?? DBNull.Value);
            update.Parameters.AddWithValue("$title", (object?)nextTitle ?? DBNull.Value);
            update.Parameters.AddWithValue("$occ", (object?)nextOccupation ?? DBNull.Value);
            update.Parameters.AddWithValue("$realm", (object?)nextHomeRealm ?? DBNull.Value);
            update.Parameters.AddWithValue("$id", characterId);
            update.ExecuteNonQuery();
        }

        if (root.TryGetProperty("aliases", out var aliasesEl) && aliasesEl.ValueKind == JsonValueKind.Array)
        {
            using (var del = db.CreateCommand())
            {
                del.Transaction = tx;
                del.CommandText = "DELETE FROM CharacterAliases WHERE CharacterId = $id";
                del.Parameters.AddWithValue("$id", characterId);
                del.ExecuteNonQuery();
            }
            var seen = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
            int pos = 0;
            foreach (var item in aliasesEl.EnumerateArray())
            {
                var alias = item.GetString()?.Trim();
                if (string.IsNullOrEmpty(alias) || !seen.Add(alias)) continue;
                using var ins = db.CreateCommand();
                ins.Transaction = tx;
                ins.CommandText = "INSERT INTO CharacterAliases (CharacterId, Alias, Position) VALUES ($id, $alias, $pos)";
                ins.Parameters.AddWithValue("$id", characterId);
                ins.Parameters.AddWithValue("$alias", alias);
                ins.Parameters.AddWithValue("$pos", pos++);
                ins.ExecuteNonQuery();
            }
        }

        tx.Commit();
        await HandleGetCharacter(response, characterId);
    }

    private async Task HandleListMaids(HttpListenerResponse response)
    {
        using var db = OpenReadOnly();
        var entries = new List<object>();
        using (var cmd = db.CreateCommand())
        {
            cmd.CommandText = """
                SELECT m.Maid, m.RegionCode, m.SerialNumber, m.CharacterId, c.Name, c.HomeRealm,
                       m.Status, m.IssuedAt, m.RetiredAt, m.Notes
                FROM MaidRegistry m
                LEFT JOIN Characters c ON c.CharacterId = m.CharacterId
                ORDER BY m.SerialNumber ASC
                """;
            using var r = cmd.ExecuteReader();
            while (r.Read())
            {
                entries.Add(new
                {
                    maid = r.GetString(0),
                    regionCode = r.GetString(1),
                    serialNumber = r.GetInt64(2),
                    characterId = r.IsDBNull(3) ? null : r.GetString(3),
                    characterName = r.IsDBNull(4) ? null : r.GetString(4),
                    homeRealm = r.IsDBNull(5) ? null : r.GetString(5),
                    status = r.GetString(6),
                    issuedAt = r.GetString(7),
                    retiredAt = r.IsDBNull(8) ? null : r.GetString(8),
                    notes = r.IsDBNull(9) ? null : r.GetString(9),
                });
            }
        }

        var retiredSerials = new List<object>();
        using (var cmd = db.CreateCommand())
        {
            cmd.CommandText = "SELECT SerialNumber, Maid, Reason, RetiredAt FROM MaidRetiredSerials ORDER BY SerialNumber";
            using var r = cmd.ExecuteReader();
            while (r.Read())
            {
                retiredSerials.Add(new
                {
                    serialNumber = r.GetInt64(0),
                    serialPadded = r.GetInt64(0).ToString("D8"),
                    maid = r.IsDBNull(1) ? null : r.GetString(1),
                    reason = r.GetString(2),
                    retiredAt = r.GetString(3),
                });
            }
        }

        var sequences = new Dictionary<string, long>();
        using (var cmd = db.CreateCommand())
        {
            cmd.CommandText = "SELECT RegionCode, NextSerial FROM MaidSequences ORDER BY RegionCode";
            using var r = cmd.ExecuteReader();
            while (r.Read())
            {
                sequences[r.GetString(0)] = r.GetInt64(1);
            }
        }

        await WorldSaveApi.Reply(response, 200, new
        {
            authorizedRegions = ValidRegionCodes,
            entries,
            retiredSerials,
            sequences,
        });
    }

    private async Task HandleValidateMaid(HttpListenerRequest request, HttpListenerResponse response)
    {
        using var reader = new StreamReader(request.InputStream, request.ContentEncoding);
        var raw = await reader.ReadToEndAsync();
        using var doc = JsonDocument.Parse(string.IsNullOrWhiteSpace(raw) ? "{}" : raw);
        var maidInput = doc.RootElement.TryGetProperty("maid", out var el) ? el.GetString()?.Trim().ToUpperInvariant() ?? "" : "";

        var match = MaidRegex.Match(maidInput);
        if (!match.Success)
        {
            await WorldSaveApi.Reply(response, 200, new
            {
                valid = false,
                maid = maidInput,
                error = "Invalid MAID format. Must match MAID-<REGION>-<8 DIGITS> with region in OR, FR, LU, MA, BR, KA, NE, VR."
            });
            return;
        }

        var region = match.Groups[1].Value;
        var serialStr = match.Groups[2].Value;
        var serialNum = long.Parse(serialStr);

        using var db = OpenReadOnly();
        using (var cmd = db.CreateCommand())
        {
            cmd.CommandText = "SELECT Reason FROM MaidRetiredSerials WHERE SerialNumber = $s";
            cmd.Parameters.AddWithValue("$s", serialNum);
            var retiredReason = cmd.ExecuteScalar() as string;
            if (retiredReason != null)
            {
                await WorldSaveApi.Reply(response, 200, new
                {
                    valid = true,
                    available = false,
                    retired = true,
                    maid = maidInput,
                    region,
                    sequence = serialStr,
                    reason = retiredReason,
                });
                return;
            }
        }

        using (var cmd = db.CreateCommand())
        {
            cmd.CommandText = "SELECT CharacterId, Status FROM MaidRegistry WHERE UPPER(TRIM(Maid)) = $m";
            cmd.Parameters.AddWithValue("$m", maidInput);
            using var r = cmd.ExecuteReader();
            if (r.Read())
            {
                await WorldSaveApi.Reply(response, 200, new
                {
                    valid = true,
                    available = false,
                    retired = r.GetString(1) == "retired",
                    maid = maidInput,
                    region,
                    sequence = serialStr,
                    characterId = r.IsDBNull(0) ? null : r.GetString(0),
                    status = r.GetString(1),
                });
                return;
            }
        }

        await WorldSaveApi.Reply(response, 200, new
        {
            valid = true,
            available = true,
            retired = false,
            maid = maidInput,
            region,
            sequence = serialStr,
        });
    }

    private async Task HandleAllocateMaid(HttpListenerRequest request, HttpListenerResponse response)
    {
        using var reader = new StreamReader(request.InputStream, request.ContentEncoding);
        var raw = await reader.ReadToEndAsync();
        using var doc = JsonDocument.Parse(string.IsNullOrWhiteSpace(raw) ? "{}" : raw);
        var root = doc.RootElement;

        var regionInput = root.TryGetProperty("regionCode", out var rc) ? rc.GetString()
            : root.TryGetProperty("registrationRegion", out var rr) ? rr.GetString()
            : null;
        if (!TryResolveRegionCode(regionInput, out var regionCode))
        {
            await WorldSaveApi.Reply(response, 400, new
            {
                error = $"Invalid or unauthorized registration region '{regionInput}'. Allowed codes: {string.Join(", ", ValidRegionCodes)}."
            });
            return;
        }

        string? characterId = root.TryGetProperty("characterId", out var cidEl) && cidEl.ValueKind == JsonValueKind.String
            ? cidEl.GetString()?.Trim()
            : null;
        string? notes = root.TryGetProperty("notes", out var nEl) && nEl.ValueKind == JsonValueKind.String
            ? nEl.GetString()?.Trim()
            : null;

        using var db = OpenReadWrite();
        using var tx = db.BeginTransaction();

        if (!string.IsNullOrEmpty(characterId))
        {
            using (var rchk = db.CreateCommand())
            {
                rchk.Transaction = tx;
                rchk.CommandText = "SELECT 1 FROM RetiredCharacters WHERE CharacterId = $id";
                rchk.Parameters.AddWithValue("$id", characterId);
                if (rchk.ExecuteScalar() != null)
                {
                    await WorldSaveApi.Reply(response, 409, new { error = $"Character '{characterId}' is retired; cannot allocate MAID." });
                    return;
                }
            }
            using (var cchk = db.CreateCommand())
            {
                cchk.Transaction = tx;
                cchk.CommandText = "SELECT Maid FROM Characters WHERE CharacterId = $id";
                cchk.Parameters.AddWithValue("$id", characterId);
                using var r = cchk.ExecuteReader();
                if (!r.Read())
                {
                    await WorldSaveApi.Reply(response, 404, new { error = $"Character '{characterId}' does not exist." });
                    return;
                }
                if (!r.IsDBNull(0) && !string.IsNullOrWhiteSpace(r.GetString(0)))
                {
                    await WorldSaveApi.Reply(response, 409, new
                    {
                        error = $"Character '{characterId}' already holds immutable MAID '{r.GetString(0)}'.",
                        existingMaid = r.GetString(0),
                    });
                    return;
                }
            }
        }

        long candidate = 481929;
        using (var seqCmd = db.CreateCommand())
        {
            seqCmd.Transaction = tx;
            seqCmd.CommandText = "SELECT COALESCE(MAX(NextSerial), 481929) FROM MaidSequences";
            candidate = Math.Max(candidate, Convert.ToInt64(seqCmd.ExecuteScalar()));
        }

        var retiredSet = new HashSet<long>();
        using (var retCmd = db.CreateCommand())
        {
            retCmd.Transaction = tx;
            retCmd.CommandText = "SELECT SerialNumber FROM MaidRetiredSerials";
            using var r = retCmd.ExecuteReader();
            while (r.Read()) retiredSet.Add(r.GetInt64(0));
        }

        var usedSerials = new HashSet<long>();
        using (var usedCmd = db.CreateCommand())
        {
            usedCmd.Transaction = tx;
            usedCmd.CommandText = "SELECT SerialNumber FROM MaidRegistry";
            using var r = usedCmd.ExecuteReader();
            while (r.Read()) usedSerials.Add(r.GetInt64(0));
        }

        string allocatedMaid;
        while (true)
        {
            if (retiredSet.Contains(candidate) || usedSerials.Contains(candidate))
            {
                candidate++;
                continue;
            }
            allocatedMaid = $"MAID-{regionCode}-{candidate:D8}";
            using var dupCmd = db.CreateCommand();
            dupCmd.Transaction = tx;
            dupCmd.CommandText = """
                SELECT 1 FROM Characters WHERE UPPER(TRIM(Maid)) = $m
                UNION ALL
                SELECT 1 FROM MaidRegistry WHERE UPPER(TRIM(Maid)) = $m
                LIMIT 1
                """;
            dupCmd.Parameters.AddWithValue("$m", allocatedMaid);
            if (dupCmd.ExecuteScalar() == null) break;
            candidate++;
        }

        var now = DateTime.UtcNow.ToString("yyyy-MM-dd HH:mm:ss");
        using (var insCmd = db.CreateCommand())
        {
            insCmd.Transaction = tx;
            insCmd.CommandText = """
                INSERT INTO MaidRegistry (Maid, RegionCode, SerialNumber, CharacterId, Status, IssuedAt, Notes)
                VALUES ($maid, $region, $serial, $cid, 'active', $now, $notes)
                """;
            insCmd.Parameters.AddWithValue("$maid", allocatedMaid);
            insCmd.Parameters.AddWithValue("$region", regionCode);
            insCmd.Parameters.AddWithValue("$serial", candidate);
            insCmd.Parameters.AddWithValue("$cid", (object?)characterId ?? DBNull.Value);
            insCmd.Parameters.AddWithValue("$now", now);
            insCmd.Parameters.AddWithValue("$notes", (object?)notes ?? "Allocated via CanonicalDataApi");
            insCmd.ExecuteNonQuery();
        }

        if (!string.IsNullOrEmpty(characterId))
        {
            using var updChar = db.CreateCommand();
            updChar.Transaction = tx;
            updChar.CommandText = "UPDATE Characters SET Maid = $maid WHERE CharacterId = $cid";
            updChar.Parameters.AddWithValue("$maid", allocatedMaid);
            updChar.Parameters.AddWithValue("$cid", characterId);
            updChar.ExecuteNonQuery();
        }

        using (var updSeq = db.CreateCommand())
        {
            updSeq.Transaction = tx;
            updSeq.CommandText = "UPDATE MaidSequences SET NextSerial = MAX(NextSerial, $next), UpdatedAt = $now";
            updSeq.Parameters.AddWithValue("$next", candidate + 1);
            updSeq.Parameters.AddWithValue("$now", now);
            updSeq.ExecuteNonQuery();
        }

        tx.Commit();
        await WorldSaveApi.Reply(response, 201, new
        {
            maid = allocatedMaid,
            regionCode,
            serialNumber = candidate,
            characterId,
            status = "active",
            issuedAt = now,
        });
    }

    private async Task HandleListCareers(HttpListenerResponse response)
    {
        using var db = OpenReadOnly();
        var careers = new List<object>();
        using var cmd = db.CreateCommand();
        cmd.CommandText = """
            SELECT c.id, c.name, c.archetype, c.description, c.primary_stat, c.starting_credits, c.starting_xp,
                   p.FrontendId, p.Category, p.StationId, p.BaseSalaryCredits, p.ReputationKey,
                   p.PrimaryAttribute, p.SpecialistLabel, p.SupervisoryLabel, p.Requirements,
                   p.GameplayConnections, p.PrimaryWorkplacesJson, p.DutiesJson, p.TierTitlesJson,
                   p.RelevantSkillsJson, p.XpThresholdsJson, p.QualificationMissionIdsJson
            FROM Careers c
            LEFT JOIN CareerProgression p ON p.CareerId = c.id
            ORDER BY c.id
            """;
        using var r = cmd.ExecuteReader();
        while (r.Read())
        {
            careers.Add(new
            {
                canonicalId = r.GetString(0),
                id = r.IsDBNull(7) ? r.GetString(0) : r.GetString(7),
                frontendId = r.IsDBNull(7) ? null : r.GetString(7),
                name = r.GetString(1),
                archetype = r.GetString(2),
                description = r.IsDBNull(3) ? "" : r.GetString(3),
                primaryStat = r.IsDBNull(4) ? "" : r.GetString(4),
                startingCredits = r.IsDBNull(5) ? 1500 : r.GetInt64(5),
                startingXp = r.IsDBNull(6) ? 0 : r.GetInt64(6),
                category = r.IsDBNull(8) ? r.GetString(2) : r.GetString(8),
                stationId = r.IsDBNull(9) ? r.GetString(0) : r.GetString(9),
                baseSalaryCredits = r.IsDBNull(10) ? 150 : r.GetInt64(10),
                reputationKey = r.IsDBNull(11) ? "" : r.GetString(11),
                primaryAttribute = r.IsDBNull(12) ? (r.IsDBNull(4) ? "" : r.GetString(4)) : r.GetString(12),
                specialistLabel = r.IsDBNull(13) ? "" : r.GetString(13),
                supervisoryLabel = r.IsDBNull(14) ? "" : r.GetString(14),
                requirements = r.IsDBNull(15) ? "" : r.GetString(15),
                gameplayConnections = r.IsDBNull(16) ? "" : r.GetString(16),
                primaryWorkplaces = ParseJsonStringArray(r.IsDBNull(17) ? null : r.GetString(17)),
                duties = ParseJsonStringArray(r.IsDBNull(18) ? null : r.GetString(18)),
                tierTitles = ParseJsonStringArray(r.IsDBNull(19) ? null : r.GetString(19)),
                relevantSkills = ParseJsonStringArray(r.IsDBNull(20) ? null : r.GetString(20)),
                xpThresholds = ParseJsonIntArray(r.IsDBNull(21) ? null : r.GetString(21)),
                qualificationMissionIds = ParseJsonStringArray(r.IsDBNull(22) ? null : r.GetString(22)),
            });
        }
        await WorldSaveApi.Reply(response, 200, new { careers, total = careers.Count });
    }

    private async Task HandleListMissions(HttpListenerResponse response)
    {
        using var db = OpenReadOnly();
        var missions = new List<object>();
        using var cmd = db.CreateCommand();
        cmd.CommandText = """
            SELECT m.id, m.title, m.type, m.tier, m.difficulty, m.description, m.objectives,
                   m.reward_xp, m.reward_credits, m.status,
                   meta.CareerId, meta.FrontendTrack, meta.WorknetCategory, meta.ActivityScope,
                   meta.Department, meta.Location, meta.Workplace, meta.Severity,
                   meta.TargetSubject, meta.ThreatOrSymptom, meta.RequiredAction,
                   meta.RewardBits, meta.PrimaryAttribute, meta.PermittedToolsJson,
                   meta.PrerequisitesJson, meta.EvidenceRequirementsJson
            FROM Missions m
            LEFT JOIN MissionCatalogMeta meta ON meta.MissionId = m.id
            ORDER BY m.id
            """;
        using var r = cmd.ExecuteReader();
        while (r.Read())
        {
            missions.Add(new
            {
                id = r.GetString(0),
                title = r.GetString(1),
                type = r.IsDBNull(12) ? r.GetString(2) : r.GetString(12),
                tier = r.GetString(3),
                difficulty = r.IsDBNull(4) ? "Novice" : r.GetString(4),
                description = r.IsDBNull(5) ? "" : r.GetString(5),
                objectives = ParseJsonStringArray(r.IsDBNull(6) ? null : r.GetString(6)),
                rewardXP = r.IsDBNull(7) ? 100 : r.GetInt64(7),
                rewardCredits = r.IsDBNull(8) ? 100 : r.GetInt64(8),
                status = r.IsDBNull(9) ? "Available" : r.GetString(9),
                careerId = r.IsDBNull(10) ? null : r.GetString(10),
                track = r.IsDBNull(11) ? "questnotice" : r.GetString(11),
                worknetCategory = r.IsDBNull(12) ? r.GetString(2) : r.GetString(12),
                activityScope = r.IsDBNull(13) ? "task" : r.GetString(13),
                department = r.IsDBNull(14) ? "" : r.GetString(14),
                location = r.IsDBNull(15) ? "" : r.GetString(15),
                workplace = r.IsDBNull(16) ? "" : r.GetString(16),
                severity = r.IsDBNull(17) ? "Routine" : r.GetString(17),
                targetSubject = r.IsDBNull(18) ? "" : r.GetString(18),
                threatOrSymptom = r.IsDBNull(19) ? null : r.GetString(19),
                requiredAction = r.IsDBNull(20) ? "" : r.GetString(20),
                rewardBits = r.IsDBNull(21) ? 0 : r.GetInt64(21),
                primaryAttribute = r.IsDBNull(22) ? "" : r.GetString(22),
                permittedTools = ParseJsonStringArray(r.IsDBNull(23) ? null : r.GetString(23)),
                prerequisites = ParseJsonStringArray(r.IsDBNull(24) ? null : r.GetString(24)),
                evidenceRequirements = ParseJsonStringArray(r.IsDBNull(25) ? null : r.GetString(25)),
            });
        }
        await WorldSaveApi.Reply(response, 200, new { missions, total = missions.Count });
    }

    private async Task HandleListOrganizations(HttpListenerResponse response)
    {
        using var db = OpenReadOnly();
        var entertainment = new List<object>();
        using (var cmd = db.CreateCommand())
        {
            cmd.CommandText = """
                SELECT OrganizationId, Name, ShortName, Sector, Kind, Domain, Handle, Realm, Seat,
                       Tagline, CommissionRate, RoyaltySplitArtist, VenueCapacity,
                       MinRecognitionRequired, RentalCostCredits, DataJson
                FROM EntertainmentOrganizations
                ORDER BY Sector, Name
                """;
            using var r = cmd.ExecuteReader();
            while (r.Read())
            {
                entertainment.Add(new
                {
                    organizationId = r.GetString(0),
                    name = r.GetString(1),
                    shortName = r.GetString(2),
                    sector = r.GetString(3),
                    kind = r.GetString(4),
                    domain = r.GetString(5),
                    handle = r.GetString(6),
                    realm = r.GetString(7),
                    seat = r.GetString(8),
                    tagline = r.GetString(9),
                    commissionRate = r.IsDBNull(10) ? (double?)null : r.GetDouble(10),
                    royaltySplitArtist = r.IsDBNull(11) ? (double?)null : r.GetDouble(11),
                    venueCapacity = r.IsDBNull(12) ? (long?)null : r.GetInt64(12),
                    minRecognitionRequired = r.IsDBNull(13) ? (double?)null : r.GetDouble(13),
                    rentalCostCredits = r.IsDBNull(14) ? (double?)null : r.GetDouble(14),
                    data = JsonSerializer.Deserialize<JsonElement>(r.GetString(15)),
                });
            }
        }

        var worldOrgs = new List<object>();
        using (var cmd = db.CreateCommand())
        {
            cmd.CommandText = """
                SELECT Section, RecordKey, Name, Description, DataJson
                FROM WorldRecords
                WHERE Domain = 'organizations' AND Section <> 'entertainmentIndustry'
                ORDER BY Section, Position
                """;
            using var r = cmd.ExecuteReader();
            while (r.Read())
            {
                worldOrgs.Add(new
                {
                    section = r.GetString(0),
                    id = r.GetString(1),
                    name = r.IsDBNull(2) ? "" : r.GetString(2),
                    description = r.IsDBNull(3) ? "" : r.GetString(3),
                    data = JsonSerializer.Deserialize<JsonElement>(r.GetString(4)),
                });
            }
        }

        await WorldSaveApi.Reply(response, 200, new
        {
            entertainmentOrganizations = entertainment,
            worldOrganizations = worldOrgs,
            total = entertainment.Count + worldOrgs.Count,
        });
    }
}
