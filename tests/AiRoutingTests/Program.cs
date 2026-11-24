using System.Net;
using System.Text;
using System.Text.Json;
using Microsoft.Data.Sqlite;
using MiraverseOSx.Ai;

// Isolated credentials and intercepted HTTP: these checks never call cloud services.
foreach (string key in new[] { "GEMINI_API_KEY", "OPENAI_API_KEY", "GROQ_API_KEY" })
    Environment.SetEnvironmentVariable(key, "test-" + key);
Environment.SetEnvironmentVariable("AI_PREFERRED_PROVIDER", "groq");
Environment.SetEnvironmentVariable("AI_DAILY_BUDGET_USD", "1");
var directory = Path.Combine(Path.GetTempPath(), "miraverse-routing-" + Guid.NewGuid().ToString("N"));
var handler = new FakeCloud();
using var http = new HttpClient(handler);
try
{
    var repo = new NpcMemoryRepository(directory);
    var router = new AiRouterService(repo, new AiCostController(repo), new GeminiProvider(http),
        new OpenAiProvider(http), new OpenAiProvider(http, isGroq: true));
    void Check(bool condition, string message)
    {
        if (!condition) throw new Exception(message);
        Console.WriteLine("PASS " + message);
    }
    AiChatRequest Request(string? provider = null, string prompt = "Please recall our conversation about the garden today.") =>
        new() { Npc = "Mai", Prompt = prompt, ActiveApp = "desktop", PreferredProvider = provider };

    Check(router.GroqConfigured && router.OpenAiConfigured && router.ActiveProvider == "groq", "Independent Groq configuration and default preference");
    repo.AddMemory("Mai", "Remember the garden fountain", "episodic", 5);
    var groq = await router.ChatAsync(Request());
    Check(groq.Provider == "groq" && handler.Calls.SequenceEqual(new[] { "groq" }), "Environment selects Groq even with all credentials configured");
    Check(handler.LastSystem.Contains("Remember the garden fountain") && groq.MemoriesUsed.Contains("Remember the garden fountain"), "NPC memories reach cloud context");
    Check(repo.GetTopMemories("Mai", 100).Any(m => m.Content.Contains("Turn with player")), "Successful cloud dialogue preserves episodic memory commits");
    Check(repo.GetDailyMetrics(DateTime.UtcNow).TotalRequests > 0, "Cloud usage is recorded");
    var cached = await router.ChatAsync(Request(" GROQ "));
    Check(cached.Cached && cached.Provider == "groq" && handler.Calls.Count == 1, "Normalized preference preserves cached provider identity");
    handler.Calls.Clear();
    var openai = await router.ChatAsync(Request("openai"));
    Check(!openai.Cached && openai.Provider == "openai" && handler.Calls.SequenceEqual(new[] { "openai" }), "Request override bypasses another provider's cache");
    handler.Calls.Clear();
    handler.Fail.Add("groq");
    handler.Empty.Add("google-gemini");
    var failover = await router.ChatAsync(Request("groq", "A fresh failover question"));
    Check(failover.Provider == "openai" && handler.Calls.SequenceEqual(new[] { "groq", "google-gemini", "openai" }), "Errors and empty responses continue through all configured providers");
    handler.Calls.Clear();
    handler.Fail.Add("openai");
    var offline = await router.ChatAsync(Request("groq", "A fresh offline question"));
    Check(offline.Provider == "native-persona" && offline.Tokens.Total == 0, "Exhausted providers return deterministic persona with zero tokens");
    handler.Fail.Clear(); handler.Empty.Clear(); handler.Calls.Clear();
    var scoped = await router.ChatAsync(new AiChatRequest { Npc = "Mai", Prompt = "Known facts?", ActiveApp = "dga-operations", ContextScope = "case-a", Context = "facts" });
    Check(scoped.MemoriesUsed.Count == 0 && !handler.LastSystem.Contains("Remember the garden fountain"), "Investigations remain isolated from global NPC memories");
    var editorial = await router.ChatAsync(new AiChatRequest { Npc = "Mai", Prompt = "Suggest a public deck for editorial review.", ActiveApp = "media-editor", ContextScope = "public:relay", Context = "A relay repair was accepted." });
    Check(editorial.MemoriesUsed.Count == 0 && !handler.LastSystem.Contains("Remember the garden fountain") && handler.LastSystem.Contains("released public copy"), "Editorial polish uses only scoped public copy and never NPC memory");
    foreach (string key in new[] { "OPENAI_API_KEY", "GROQ_API_KEY", "GEMINI_API_KEY" }) Environment.SetEnvironmentVariable(key, " ");
    Check(!router.GroqConfigured && !router.OpenAiConfigured && router.ActiveProvider == "native-persona", "Blank credentials are unconfigured");
    var local = await router.ChatAsync(Request());
    Check(!local.Cached && local.Provider == "native-persona", "Configuration changes cannot reuse cached cloud response");
    Environment.SetEnvironmentVariable("GROQ_API_KEY", "test-groq");
    handler.Calls.Clear();
    var onlyGroq = await router.ChatAsync(Request("openai", "Only Groq is configured"));
    Check(router.ActiveProvider == "groq" && onlyGroq.Provider == "groq" && handler.Calls.SequenceEqual(new[] { "groq" }), "Groq-only configuration supports fallback from unavailable preference");
    Environment.SetEnvironmentVariable("AI_DAILY_BUDGET_USD", "0");
    var capped = new AiRouterService(repo, new AiCostController(repo), new GeminiProvider(http), new OpenAiProvider(http), new OpenAiProvider(http, true));
    handler.Calls.Clear();
    Check((await capped.ChatAsync(Request())).Provider == "native-persona-budget-cap" && handler.Calls.Count == 0, "Budget ceiling prevents cloud requests");
}
finally
{
    SqliteConnection.ClearAllPools();
    if (Directory.Exists(directory)) Directory.Delete(directory, true);
}

sealed class FakeCloud : HttpMessageHandler
{
    public List<string> Calls { get; } = new();
    public HashSet<string> Fail { get; } = new();
    public HashSet<string> Empty { get; } = new();
    public string LastSystem { get; private set; } = "";
    protected override async Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken token)
    {
        string provider = request.RequestUri!.Host switch
        {
            "api.groq.com" => "groq",
            "api.openai.com" => "openai",
            "generativelanguage.googleapis.com" => "google-gemini",
            _ => throw new Exception("Unexpected endpoint")
        };
        Calls.Add(provider);
        string body = await request.Content!.ReadAsStringAsync(token);
        if (provider != "google-gemini")
        {
            if (request.Headers.Authorization?.Parameter != "test-" + (provider == "groq" ? "GROQ_API_KEY" : "OPENAI_API_KEY") && request.Headers.Authorization?.Parameter != "test-groq")
                throw new Exception("Incorrect provider credentials");
            LastSystem = JsonDocument.Parse(body).RootElement.GetProperty("messages")[0].GetProperty("content").GetString()!;
        }
        if (Fail.Contains(provider)) return new(HttpStatusCode.ServiceUnavailable) { Content = new StringContent("unavailable") };
        string text = Empty.Contains(provider) ? "" : "A cloud response";
        string json = provider == "google-gemini"
            ? JsonSerializer.Serialize(new { candidates = new[] { new { content = new { parts = new[] { new { text } } } } } })
            : JsonSerializer.Serialize(new { choices = new[] { new { message = new { content = text } } }, usage = new { prompt_tokens = 20, completion_tokens = 5 } });
        return new(HttpStatusCode.OK) { Content = new StringContent(json, Encoding.UTF8, "application/json") };
    }
}
