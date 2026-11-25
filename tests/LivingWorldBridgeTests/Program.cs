using System.Net;
using System.Text.Json;
using MiraverseOSx;

using var listener = new HttpListener();
listener.Prefixes.Add($"http://127.0.0.1:{args[0]}/");
listener.Start();
var proxy = new LivingWorldApi(int.Parse(args[1]));
Console.WriteLine("READY");
while (true)
{
    var context = await listener.GetContextAsync();
    _ = Task.Run(async () =>
    {
        if (!await proxy.Handle(context, context.Request.Url!.AbsolutePath.TrimStart('/')))
            await WorldSaveApi.Reply(context.Response, 404, new { error = "Not found" });
    });
}

namespace MiraverseOSx
{
    internal static class WorldSaveApi
    {
        internal static async Task Reply(HttpListenerResponse response, int code, object value)
        {
            var bytes = JsonSerializer.SerializeToUtf8Bytes(value);
            response.StatusCode = code;
            response.ContentType = "application/json";
            response.ContentLength64 = bytes.Length;
            await response.OutputStream.WriteAsync(bytes);
            response.Close();
        }
    }
}
