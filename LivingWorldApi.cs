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
        if (request.HttpMethod == "OPTIONS") { response.StatusCode = 204; response.Close(); return true; }

        var relative = path.Length > Prefix.Length ? path[Prefix.Length..] : "";
        var target = baseUrl + "/api/livingworld/" + relative;
        try
        {
            using var upstream = new HttpRequestMessage(new HttpMethod(request.HttpMethod), target);
            if (request.ContentType != null && request.ContentLength64 > 0)
            {
                using var body = new MemoryStream();
                await request.InputStream.CopyToAsync(body);
                upstream.Content = new ByteArrayContent(body.ToArray());
                upstream.Content.Headers.ContentType = new System.Net.Http.Headers.MediaTypeHeaderValue(request.ContentType);
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