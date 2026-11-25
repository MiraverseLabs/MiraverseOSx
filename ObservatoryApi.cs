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
        var configured = Environment.GetEnvironmentVariable("MIRAVERSE_SOURCE_DATABASE");
        var repositoryDatabase = Path.Combine(Directory.GetCurrentDirectory(), "miraverse.db");
        dbPath = !string.IsNullOrEmpty(configured) ? Path.GetFullPath(configured)
            : File.Exists(repositoryDatabase) ? repositoryDatabase
            : Path.Combine(AppContext.BaseDirectory, "miraverse.db");
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
                foreach (var table in new[] { "Characters", "CharacterProfiles", "Careers", "Missions", "Events", "LivingWorldRuns" })
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
            if (route == "citizens")
            {
                var list = new List<object>();
                using var cmd = db.CreateCommand();
                cmd.CommandText = """
                    SELECT CharacterId, Name, Kind, Status, Folder
                    FROM Characters
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
                        kind = reader.IsDBNull(2) ? "" : reader.GetString(2),
                        status = reader.IsDBNull(3) ? "" : reader.GetString(3),
                        collection = reader.IsDBNull(4) ? "" : reader.GetString(4)
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
