using System;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using System.Text.Json.Nodes;
using System.Threading;
using System.Threading.Tasks;

namespace MiraverseOSx.Ai
{
    public class OpenAiProvider
    {
        private readonly HttpClient _httpClient;
        private readonly string? _initialApiKey;
        private readonly string? _initialModel;

        // Groq uses the OpenAI wire format, but has independent credentials and identity.
        public OpenAiProvider(HttpClient httpClient, bool isGroq = false)
        {
            _httpClient = httpClient;
            IsGroq = isGroq;
            _initialApiKey = Environment.GetEnvironmentVariable(KeyVariable);
            _initialModel = Environment.GetEnvironmentVariable(ModelVariable);
        }

        private string KeyVariable => IsGroq ? "GROQ_API_KEY" : "OPENAI_API_KEY";
        private string ModelVariable => IsGroq ? "GROQ_MODEL" : "OPENAI_MODEL";
        private string? ApiKey => Environment.GetEnvironmentVariable(KeyVariable) ?? _initialApiKey;
        public bool IsConfigured => !string.IsNullOrWhiteSpace(ApiKey);
        public bool IsGroq { get; }
        public string ProviderId => IsGroq ? "groq" : "openai";
        public string ModelName => NonBlank(Environment.GetEnvironmentVariable(ModelVariable),
            NonBlank(_initialModel, IsGroq ? "openai/gpt-oss-20b" : "gpt-4o-mini"));
        public string Endpoint => IsGroq
            ? "https://api.groq.com/openai/v1/chat/completions"
            : NonBlank(Environment.GetEnvironmentVariable("OPENAI_ENDPOINT"), "https://api.openai.com/v1/chat/completions");

        private static string NonBlank(string? value, string fallback) => string.IsNullOrWhiteSpace(value) ? fallback : value;

        public async Task<(string Text, int PromptTokens, int CompletionTokens)> GenerateAsync(
            string systemPrompt,
            string userPrompt,
            int maxTokens = 120,
            CancellationToken cancellationToken = default)
        {
            var apiKey = ApiKey;
            if (string.IsNullOrWhiteSpace(apiKey))
            {
                throw new InvalidOperationException($"{KeyVariable} is not configured.");
            }

            string endpoint = Endpoint;

            var requestBody = new
            {
                model = ModelName,
                messages = new[]
                {
                    new { role = "system", content = systemPrompt },
                    new { role = "user", content = userPrompt }
                },
                max_tokens = maxTokens,
                temperature = 0.7
            };

            string jsonPayload = JsonSerializer.Serialize(requestBody);
            using var request = new HttpRequestMessage(HttpMethod.Post, endpoint);
            request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", apiKey);
            request.Content = new StringContent(jsonPayload, Encoding.UTF8, "application/json");

            using var cts = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken);
            cts.CancelAfter(TimeSpan.FromSeconds(8));

            using HttpResponseMessage response = await _httpClient.SendAsync(request, cts.Token);
            string responseBody = await response.Content.ReadAsStringAsync(cts.Token);

            if (!response.IsSuccessStatusCode)
            {
                throw new HttpRequestException($"{ProviderId} API error (Status {response.StatusCode}): {responseBody}");
            }

            var root = JsonNode.Parse(responseBody);
            string generatedText = root?["choices"]?[0]?["message"]?["content"]?.ToString() ?? string.Empty;

            int promptTokens = root?["usage"]?["prompt_tokens"]?.GetValue<int>() ?? (systemPrompt.Length + userPrompt.Length) / 4;
            int completionTokens = root?["usage"]?["completion_tokens"]?.GetValue<int>() ?? generatedText.Length / 4;

            return (generatedText.Trim(), promptTokens, completionTokens);
        }
    }
}
