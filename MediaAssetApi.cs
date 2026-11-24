using System;
using System.Collections.Generic;
using System.IO;
using System.Net;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using System.Text.RegularExpressions;
using System.Threading.Tasks;
using Microsoft.Data.Sqlite;

namespace MiraverseOSx;

internal sealed class MediaAssetApi
{
    private const int MaxUploadBytes = 8 * 1024 * 1024;
    private static readonly HashSet<string> AllowedMimeTypes = new(StringComparer.OrdinalIgnoreCase)
    {
        "image/png",
        "image/jpeg",
        "image/webp",
        "image/svg+xml"
    };

    private readonly string _mediaFilesDir;
    private readonly string _connectionString;

    public MediaAssetApi(string dataDirectory)
    {
        Directory.CreateDirectory(dataDirectory);
        _mediaFilesDir = Path.Combine(dataDirectory, "media");
        Directory.CreateDirectory(_mediaFilesDir);
        _connectionString = new SqliteConnectionStringBuilder
        {
            DataSource = Path.Combine(dataDirectory, "media-assets.db"),
            DefaultTimeout = 5
        }.ToString();

        using var db = Open();
        using var cmd = db.CreateCommand();
        cmd.CommandText = """
            PRAGMA journal_mode=WAL;
            CREATE TABLE IF NOT EXISTS RuntimeMediaAssets (
                Id TEXT PRIMARY KEY,
                FileName TEXT NOT NULL,
                MimeType TEXT NOT NULL,
                Sha256 TEXT NOT NULL,
                ByteSize INTEGER NOT NULL,
                SlotRole TEXT NOT NULL,
                Caption TEXT NOT NULL,
                EntityIdsJson TEXT NOT NULL,
                ProvenanceJson TEXT NOT NULL,
                Scope TEXT NOT NULL,
                CreatedAt TEXT NOT NULL
            );
            """;
        cmd.ExecuteNonQuery();
    }

    private SqliteConnection Open()
    {
        var db = new SqliteConnection(_connectionString);
        db.Open();
        return db;
    }

    public async Task<bool> Handle(HttpListenerContext context, string relPath)
    {
        if (!relPath.Equals("api/media", StringComparison.OrdinalIgnoreCase) &&
            !relPath.StartsWith("api/media/", StringComparison.OrdinalIgnoreCase))
        {
            return false;
        }

        var request = context.Request;
        var response = context.Response;
        response.Headers["X-Content-Type-Options"] = "nosniff";
        if (!request.IsLocal || !AllowedOrigin(request.Headers["Origin"], request.Url?.Port ?? 5000))
        {
            await WorldSaveApi.Reply(response, 403, new { error = "Media API is restricted to the local Miraverse host." });
            return true;
        }
        if (request.HttpMethod == "OPTIONS")
        {
            response.StatusCode = 204;
            response.Close();
            return true;
        }

        // Serve or delete specific runtime binary asset: /api/media/{id}
        if (relPath.StartsWith("api/media/", StringComparison.OrdinalIgnoreCase))
        {
            var rawKey = Uri.UnescapeDataString(relPath.Substring("api/media/".Length)).Trim();
            var cleanKey = rawKey.StartsWith("runtime:", StringComparison.OrdinalIgnoreCase) ? rawKey.Substring(8) : rawKey;
            if (!Regex.IsMatch(cleanKey, @"^[a-zA-Z0-9_-]{4,80}$"))
            {
                await WorldSaveApi.Reply(response, 400, new { error = "Invalid media asset identifier." });
                return true;
            }
            var fullId = $"runtime:{cleanKey}";

            if (request.HttpMethod == "GET")
            {
                using var db = Open();
                using var cmd = db.CreateCommand();
                cmd.CommandText = "SELECT FileName, MimeType FROM RuntimeMediaAssets WHERE Id = $id";
                cmd.Parameters.AddWithValue("$id", fullId);
                using var reader = cmd.ExecuteReader();
                if (!reader.Read())
                {
                    await WorldSaveApi.Reply(response, 404, new { error = "Media asset not found." });
                    return true;
                }
                var fileName = reader.GetString(0);
                var mimeType = reader.GetString(1);
                var diskPath = Path.GetFullPath(Path.Combine(_mediaFilesDir, fileName));
                var rootPrefix = Path.GetFullPath(_mediaFilesDir).TrimEnd(Path.DirectorySeparatorChar) + Path.DirectorySeparatorChar;
                if (!diskPath.StartsWith(rootPrefix, StringComparison.OrdinalIgnoreCase) || !File.Exists(diskPath))
                {
                    await WorldSaveApi.Reply(response, 404, new { error = "Media binary missing from storage." });
                    return true;
                }
                var bytes = await File.ReadAllBytesAsync(diskPath);
                response.StatusCode = 200;
                response.ContentType = mimeType;
                response.Headers["Cache-Control"] = "private, max-age=3600";
                if (mimeType.Equals("image/svg+xml", StringComparison.OrdinalIgnoreCase))
                {
                    response.Headers["Content-Security-Policy"] = "default-src 'none'; style-src 'unsafe-inline'; sandbox";
                }
                response.ContentLength64 = bytes.Length;
                await response.OutputStream.WriteAsync(bytes);
                response.Close();
                return true;
            }

            if (request.HttpMethod == "DELETE")
            {
                using var db = Open();
                using var select = db.CreateCommand();
                select.CommandText = "SELECT FileName FROM RuntimeMediaAssets WHERE Id = $id";
                select.Parameters.AddWithValue("$id", fullId);
                var existingFile = select.ExecuteScalar() as string;
                if (existingFile == null)
                {
                    await WorldSaveApi.Reply(response, 404, new { error = "Media asset not found." });
                    return true;
                }
                using var del = db.CreateCommand();
                del.CommandText = "DELETE FROM RuntimeMediaAssets WHERE Id = $id";
                del.Parameters.AddWithValue("$id", fullId);
                del.ExecuteNonQuery();
                var diskPath = Path.Combine(_mediaFilesDir, existingFile);
                if (File.Exists(diskPath)) File.Delete(diskPath);
                await WorldSaveApi.Reply(response, 200, new { ok = true, deletedId = fullId });
                return true;
            }

            await WorldSaveApi.Reply(response, 405, new { error = "Method not allowed." });
            return true;
        }

        // Collection route: /api/media
        if (request.HttpMethod == "GET")
        {
            var list = new List<object>();
            using var db = Open();
            using var cmd = db.CreateCommand();
            cmd.CommandText = "SELECT Id, MimeType, SlotRole, Caption, EntityIdsJson, ProvenanceJson, Scope FROM RuntimeMediaAssets ORDER BY CreatedAt DESC LIMIT 500";
            using var reader = cmd.ExecuteReader();
            while (reader.Read())
            {
                var id = reader.GetString(0);
                var shortKey = id.StartsWith("runtime:") ? id.Substring(8) : id;
                list.Add(new
                {
                    id,
                    src = $"/api/media/{shortKey}",
                    mimeType = reader.GetString(1),
                    slotRole = reader.GetString(2),
                    caption = reader.GetString(3),
                    entityIds = JsonSerializer.Deserialize<string[]>(reader.GetString(4)) ?? Array.Empty<string>(),
                    provenance = JsonSerializer.Deserialize<JsonElement>(reader.GetString(5)),
                    scope = reader.GetString(6)
                });
            }
            await WorldSaveApi.Reply(response, 200, new { assets = list });
            return true;
        }

        if (request.HttpMethod == "POST")
        {
            if (request.ContentType?.Split(';')[0].Trim() != "application/json")
            {
                await WorldSaveApi.Reply(response, 415, new { error = "JSON media upload payload required." });
                return true;
            }
            using var ms = new MemoryStream();
            var buf = new byte[8192];
            int read;
            while ((read = await request.InputStream.ReadAsync(buf)) > 0)
            {
                if (ms.Length + read > 12 * 1024 * 1024)
                {
                    await WorldSaveApi.Reply(response, 413, new { error = "Upload exceeds maximum size." });
                    return true;
                }
                await ms.WriteAsync(buf.AsMemory(0, read));
            }

            try
            {
                using var doc = JsonDocument.Parse(ms.ToArray());
                var root = doc.RootElement;
                var mimeType = root.TryGetProperty("mimeType", out var m) && m.ValueKind == JsonValueKind.String ? m.GetString()!.Trim() : "";
                if (!AllowedMimeTypes.Contains(mimeType))
                {
                    await WorldSaveApi.Reply(response, 400, new { error = "Unsupported image MIME type." });
                    return true;
                }
                var b64 = root.TryGetProperty("dataBase64", out var d) && d.ValueKind == JsonValueKind.String ? d.GetString()! : "";
                var commaIdx = b64.IndexOf(',');
                if (b64.StartsWith("data:", StringComparison.OrdinalIgnoreCase) && commaIdx >= 0) b64 = b64.Substring(commaIdx + 1);
                var rawBytes = Convert.FromBase64String(b64);
                if (rawBytes.Length == 0 || rawBytes.Length > MaxUploadBytes)
                {
                    await WorldSaveApi.Reply(response, 400, new { error = "Decoded image must be between 1 byte and 8 MB." });
                    return true;
                }

                if (mimeType.Equals("image/svg+xml", StringComparison.OrdinalIgnoreCase))
                {
                    var svgText = Encoding.UTF8.GetString(rawBytes);
                    if (Regex.IsMatch(svgText, @"<\s*script|javascript:|on\w+\s*=", RegexOptions.IgnoreCase))
                    {
                        await WorldSaveApi.Reply(response, 400, new { error = "Executable markup is prohibited in SVG media assets." });
                        return true;
                    }
                }

                var sha256 = Convert.ToHexString(SHA256.HashData(rawBytes)).ToLowerInvariant();
                var shortKey = $"med-{Guid.NewGuid():N}".Substring(0, 20);
                var fullId = $"runtime:{shortKey}";
                var ext = mimeType.ToLowerInvariant() switch
                {
                    "image/png" => ".png",
                    "image/jpeg" => ".jpg",
                    "image/webp" => ".webp",
                    "image/svg+xml" => ".svg",
                    _ => ".bin"
                };
                var fileName = $"{shortKey}{ext}";
                await File.WriteAllBytesAsync(Path.Combine(_mediaFilesDir, fileName), rawBytes);

                var slotRole = root.TryGetProperty("slotRole", out var sr) && sr.ValueKind == JsonValueKind.String && !string.IsNullOrWhiteSpace(sr.GetString())
                    ? sr.GetString()!.Trim()
                    : "media.general";
                var name = root.TryGetProperty("name", out var nm) && nm.ValueKind == JsonValueKind.String ? nm.GetString()!.Trim() : fileName;
                var caption = root.TryGetProperty("caption", out var cp) && cp.ValueKind == JsonValueKind.String && !string.IsNullOrWhiteSpace(cp.GetString())
                    ? cp.GetString()!.Trim()
                    : name;
                var creator = root.TryGetProperty("creator", out var cr) && cr.ValueKind == JsonValueKind.String && !string.IsNullOrWhiteSpace(cr.GetString())
                    ? cr.GetString()!.Trim()
                    : "Citizen Creator";
                var scope = root.TryGetProperty("scope", out var sc) && sc.ValueKind == JsonValueKind.String ? sc.GetString()! : "player_work";
                if (scope != "admin_canon" && scope != "player_work" && scope != "npc_generated") scope = "player_work";

                var entityIds = new List<string>();
                if (root.TryGetProperty("entityIds", out var ents) && ents.ValueKind == JsonValueKind.Array)
                {
                    foreach (var el in ents.EnumerateArray())
                    {
                        if (el.ValueKind == JsonValueKind.String && !string.IsNullOrWhiteSpace(el.GetString()))
                            entityIds.Add(el.GetString()!.Trim());
                    }
                }

                var createdDate = DateTimeOffset.UtcNow.ToString("yyyy-MM-dd");
                var provenance = new
                {
                    origin = scope == "admin_canon" ? "admin_upload" : scope == "npc_generated" ? "npc_generated" : "player_upload",
                    creator,
                    license = scope == "admin_canon" ? "First-Party Original" : "In-World Studio Asset",
                    approvalStatus = scope == "admin_canon" ? "approved" : "player_sandbox",
                    createdAt = createdDate,
                    sha256
                };

                var entityIdsJson = JsonSerializer.Serialize(entityIds);
                var provenanceJson = JsonSerializer.Serialize(provenance);
                var nowIso = DateTimeOffset.UtcNow.ToString("O");

                using var db = Open();
                using var ins = db.CreateCommand();
                ins.CommandText = """
                    INSERT INTO RuntimeMediaAssets (Id, FileName, MimeType, Sha256, ByteSize, SlotRole, Caption, EntityIdsJson, ProvenanceJson, Scope, CreatedAt)
                    VALUES ($id, $fn, $mime, $sha, $size, $slot, $cap, $ents, $prov, $scope, $now);
                    """;
                ins.Parameters.AddWithValue("$id", fullId);
                ins.Parameters.AddWithValue("$fn", fileName);
                ins.Parameters.AddWithValue("$mime", mimeType);
                ins.Parameters.AddWithValue("$sha", sha256);
                ins.Parameters.AddWithValue("$size", rawBytes.Length);
                ins.Parameters.AddWithValue("$slot", slotRole);
                ins.Parameters.AddWithValue("$cap", caption);
                ins.Parameters.AddWithValue("$ents", entityIdsJson);
                ins.Parameters.AddWithValue("$prov", provenanceJson);
                ins.Parameters.AddWithValue("$scope", scope);
                ins.Parameters.AddWithValue("$now", nowIso);
                ins.ExecuteNonQuery();

                await WorldSaveApi.Reply(response, 201, new
                {
                    ok = true,
                    asset = new
                    {
                        id = fullId,
                        src = $"/api/media/{shortKey}",
                        mimeType,
                        slotRole,
                        caption,
                        entityIds,
                        provenance,
                        scope
                    }
                });
                return true;
            }
            catch (FormatException)
            {
                await WorldSaveApi.Reply(response, 400, new { error = "Malformed base64 media payload." });
                return true;
            }
            catch (JsonException)
            {
                await WorldSaveApi.Reply(response, 400, new { error = "Invalid JSON upload request." });
                return true;
            }
        }

        await WorldSaveApi.Reply(response, 405, new { error = "Method not allowed." });
        return true;
    }

    private static bool AllowedOrigin(string? origin, int port)
    {
        if (string.IsNullOrEmpty(origin)) return true;
        return Uri.TryCreate(origin, UriKind.Absolute, out var uri)
            && uri.Scheme == "http"
            && (uri.Host == "localhost" || uri.Host == "127.0.0.1" || uri.Host == "[::1]")
            && (uri.Port == port || uri.Port is >= 3000 and <= 3099);
    }
}
