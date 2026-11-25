using System;
using System.Net;
using System.Net.Http;
using System.Text;
using System.Threading.Tasks;

namespace MiraverseOSx;

// Forwards Living World Engine requests to the Python simulation service.
internal sealed class LivingWorldApi
{
    private const string Prefix = "api/livingworld/";
    private readonly string baseUrl;
    private readonly HttpClient client;

    public LivingWorldApi(int port = 5010)
    {
        baseUrl = $"http://127.0.0.1:{port}";
        client = new HttpClient { Timeout = TimeSpan.FromSeconds(30) };
    }

    public async Task<bool> Handle(HttpListenerContext context, string path)
    {
        if (!path.StartsWith(Prefix, StringComparison.OrdinalIgnoreCase)) return false;
        var request = context.Request;
        var response = context.Response;
        response.Headers["Cache-Control"] = "no-store";
        response.Headers["X-Content-Type-Options"] = "nosniff";
        if (!request.IsLocal) { await WorldSaveApi.Reply(response, 403, new { error = "Local access only." }); return true; }
        var origin = request.Headers["Origin"];
        if (!string.IsNullOrEmpty(origin) && (!Uri.TryCreate(origin, UriKind.Absolute, out var originUri)
            || originUri.Scheme != "http" || (originUri.Host != "localhost" && originUri.Host != "127.0.0.1")
            || (originUri.Port != request.Url?.Port && originUri.Port != 3000)))
        { await WorldSaveApi.Reply(response, 403, new { error = "Origin not permitted." }); return true; }
        if (request.HttpMethod == "OPTIONS") { response.StatusCode = 204; response.Close(); return true; }

        var relative = path.Length > Prefix.Length ? path[Prefix.Length..] : "";
        var target = baseUrl + "/api/livingworld/" + relative + request.Url?.Query;
        try
        {
            using var upstream = new HttpRequestMessage(new HttpMethod(request.HttpMethod), target);
            if (request.HasEntityBody)
            {
                using var body = new MemoryStream();
                var buffer = new byte[8192];
                int count;
                while ((count = await request.InputStream.ReadAsync(buffer)) > 0)
                {
                    if (body.Length + count > 4 * 1024 * 1024)
                    { await WorldSaveApi.Reply(response, 413, new { error = "Request body exceeds 4 MB." }); return true; }
                    await body.WriteAsync(buffer.AsMemory(0, count));
                }
                upstream.Content = new ByteArrayContent(body.ToArray());
                if (!System.Net.Http.Headers.MediaTypeHeaderValue.TryParse(request.ContentType, out var contentType))
                { await WorldSaveApi.Reply(response, 400, new { error = "A valid Content-Type is required." }); return true; }
                upstream.Content.Headers.ContentType = contentType;
            }
            using var upstreamResponse = await client.SendAsync(upstream);
            var bytes = await upstreamResponse.Content.ReadAsByteArrayAsync();
            response.StatusCode = (int)upstreamResponse.StatusCode;
            response.ContentType = "application/json; charset=utf-8";
            response.ContentLength64 = bytes.Length;
            await response.OutputStream.WriteAsync(bytes);
            response.Close();
        }
        catch (Exception ex)
        {
            await WorldSaveApi.Reply(response, 502, new { error = "Living World service unavailable.", detail = ex.Message });
        }
        return true;
    }
}
