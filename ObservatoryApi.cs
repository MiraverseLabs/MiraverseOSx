using System;
using System.Collections.Generic;
using System.Net;
using System.Text.Json;
using System.Threading.Tasks;
using Microsoft.Data.Sqlite;

namespace MiraverseOSx;

// Read-only Observatory endpoints backed by the canonical miraverse.db.
internal sealed class ObservatoryApi
{
    private const string Prefix = "api/observatory/";
    private readonly string dbPath;

    public ObservatoryApi(string dataDirectory)
    {
        dbPath = DatabasePaths.ResolveSourceDatabase();
    }

    private SqliteConnection Open()
    {
        var connection = new SqliteConnection($"Data Source={dbPath};Mode=ReadOnly");
        connection.Open();
        return connection;
    }

    public async Task<bool> Handle(HttpListenerContext context, string path)
    {
        if (!path.StartsWith(Prefix, StringComparison.OrdinalIgnoreCase)) return false;
        var request = context.Request;
        var response = context.Response;
        response.Headers["Cache-Control"] = "no-store";
        if (!request.IsLocal) { await WorldSaveApi.Reply(response, 403, new { error = "Local access only." }); return true; }
        if (request.HttpMethod != "GET") { await WorldSaveApi.Reply(response, 405, new { error = "Use GET." }); return true; }

        var route = path[Prefix.Length..].Trim('/');
        try
        {
            using var db = Open();
            if (route == "stats")
            {
                var stats = new Dictionary<string, long>();
                foreach (var table in new[] { "Characters", "RetiredCharacters", "MaidRegistry", "CharacterProfiles", "Careers", "CareerProgression", "Missions", "MissionCatalogMeta", "Events", "EntertainmentOrganizations", "LivingWorldRuns", "LivingWorldTransactions" })
                {
                    try
                    {
                        using var cmd = db.CreateCommand();
                        cmd.CommandText = $"SELECT COUNT(*) FROM {table}";
                        stats[table] = Convert.ToInt64(cmd.ExecuteScalar());
                    }
                    catch { stats[table] = -1; }
                }
                await WorldSaveApi.Reply(response, 200, stats);
                return true;
            }
            if (route == "entertainment")
            {
                var orgs = new List<object>();
                using var cmd = db.CreateCommand();
                cmd.CommandText = """
                    SELECT OrganizationId, Name, ShortName, Sector, Kind, Domain, Realm, Seat, Tagline, DataJson
                    FROM EntertainmentOrganizations
                    ORDER BY Sector, Name
                    """;
                using var reader = cmd.ExecuteReader();
                while (reader.Read())
                {
                    orgs.Add(new
                    {
                        organizationId = reader.GetString(0),
                        name = reader.GetString(1),
                        shortName = reader.GetString(2),
                        sector = reader.GetString(3),
                        kind = reader.GetString(4),
                        domain = reader.GetString(5),
                        realm = reader.GetString(6),
                        seat = reader.GetString(7),
                        tagline = reader.GetString(8),
                        data = JsonSerializer.Deserialize<JsonElement>(reader.GetString(9))
                    });
                }
                await WorldSaveApi.Reply(response, 200, new { organizations = orgs });
                return true;
            }
            if (route == "citizens")
            {
                var list = new List<object>();
                using var cmd = db.CreateCommand();
                cmd.CommandText = """
                    SELECT CharacterId, Name, FirstName, LastName, Title, Occupation, HomeRealm,
                           Kind, Status, Maid, Folder, Aliases, ProfileCount
                    FROM BrowseCharacters
                    ORDER BY Name
                    LIMIT 500
                    """;
                using var reader = cmd.ExecuteReader();
                while (reader.Read())
                {
                    list.Add(new
                    {
                        characterId = reader.GetString(0),
                        name = reader.IsDBNull(1) ? "" : reader.GetString(1),
                        firstName = reader.IsDBNull(2) ? null : reader.GetString(2),
                        lastName = reader.IsDBNull(3) ? null : reader.GetString(3),
                        title = reader.IsDBNull(4) ? null : reader.GetString(4),
                        occupation = reader.IsDBNull(5) ? null : reader.GetString(5),
                        homeRealm = reader.IsDBNull(6) ? null : reader.GetString(6),
                        kind = reader.IsDBNull(7) ? "" : reader.GetString(7),
                        status = reader.IsDBNull(8) ? "" : reader.GetString(8),
                        maid = reader.IsDBNull(9) ? null : reader.GetString(9),
                        collection = reader.IsDBNull(10) ? "" : reader.GetString(10),
                        folder = reader.IsDBNull(10) ? "" : reader.GetString(10),
                        aliases = reader.IsDBNull(11) ? "" : reader.GetString(11),
                        profileCount = reader.IsDBNull(12) ? 0 : reader.GetInt64(12)
                    });
                }
                await WorldSaveApi.Reply(response, 200, new { citizens = list });
                return true;
            }
        }
        catch (Exception ex)
        {
            await WorldSaveApi.Reply(response, 500, new { error = ex.Message });
            return true;
        }
        await WorldSaveApi.Reply(response, 404, new { error = "Unknown observatory route." });
        return true;
    }
}
