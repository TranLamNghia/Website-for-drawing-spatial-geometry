using System.Text;
using System.Text.Json;
using Application.DTOs;
using Application.Interfaces;
using Domains.MathCore;
using Microsoft.Extensions.Configuration;

namespace Infrastructure.ExternalAPIs;

public class GeometryExtractionService : IGeometryExtractionService
{
    private readonly HttpClient _httpClient;

    public GeometryExtractionService(HttpClient httpClient, IConfiguration configuration)
    {
        _httpClient = httpClient;
        var baseUrl = configuration["AiServiceSettings:BaseUrl"] ?? "http://localhost:8000/api/";
        _httpClient.BaseAddress = new Uri(baseUrl);
        
        var apiKey = configuration["AiServiceSettings:ApiKey"];
        if (!string.IsNullOrEmpty(apiKey))
        {
            _httpClient.DefaultRequestHeaders.Add("x-api-key", apiKey);
        }
    }

    public async Task<GeometryProblemDto?> ExtractGeometryAsync(string problemText)
    {
        var requestBody = new { problem_text = problemText };
        var jsonContent = new StringContent(JsonSerializer.Serialize(requestBody), Encoding.UTF8, "application/json");

        var response = await _httpClient.PostAsync("extract", jsonContent);
        
        if (!response.IsSuccessStatusCode)
        {
            var errorResponseString = await response.Content.ReadAsStringAsync();
            throw new Exception(ExtractAiErrorMessage(errorResponseString, "Error when calling Python AI Service."));
        }

        var responseBodyString = await response.Content.ReadAsStringAsync();
        using var document = JsonDocument.Parse(responseBodyString);
        var dataElement = document.RootElement.GetProperty("data");

        var options = new JsonSerializerOptions { PropertyNameCaseInsensitive = true };
        GeometryProblemDto? dto = null;

        // Case 1: If Python returns data as a real JSON Object
        if (dataElement.ValueKind == JsonValueKind.Object)
        {
            dto = dataElement.Deserialize<GeometryProblemDto>(options);
        }
        // Case 2: If Python returns data as a String (Escaped JSON)
        else if (dataElement.ValueKind == JsonValueKind.String)
        {
            var jsonString = dataElement.GetString();
            dto = JsonSerializer.Deserialize<GeometryProblemDto>(jsonString!, options);
        }
        else
        {
            throw new Exception("Format data from AI Service is invalid.");
        }

        return dto;
    }

    public async Task<MathSolverResponseDto?> FallbackSolveMathAsync(MathSolverRequestDto request)
    {
        var options = new JsonSerializerOptions { PropertyNamingPolicy = JsonNamingPolicy.CamelCase };
        var jsonContent = new StringContent(JsonSerializer.Serialize(request, options), Encoding.UTF8, "application/json");

        try
        {
            var response = await _httpClient.PostAsync("solve-math", jsonContent);
            
            if (!response.IsSuccessStatusCode)
            {
                var errStr = await response.Content.ReadAsStringAsync();
                throw new Exception(ExtractAiErrorMessage(errStr, $"Math Sandbox Error: {errStr}"));
            }

            var responseBodyString = await response.Content.ReadAsStringAsync();
            using var document = JsonDocument.Parse(responseBodyString);
            
            if (document.RootElement.TryGetProperty("data", out var dataElement))
            {
                // Check if data is an error message instead of point coordinates
                if (dataElement.ValueKind == JsonValueKind.Object && dataElement.TryGetProperty("STATUS", out var status) && status.GetString() == "ERROR")
                {
                    string msg = dataElement.TryGetProperty("ERROR_MESSAGE", out var m) ? (m.GetString() ?? "Unknown SymPy Error") : "Unknown SymPy Error";
                    Console.WriteLine($"[AI_FALLBACK] SymPy failed: {msg}");
                    return null;
                }

                // If result contains "sections", it's likely a MathSolverResponseDto
                if (dataElement.TryGetProperty("sections", out _) || dataElement.TryGetProperty("points", out _))
                {
                     return JsonSerializer.Deserialize<MathSolverResponseDto>(dataElement.GetRawText(), new JsonSerializerOptions { PropertyNameCaseInsensitive = true });
                }

                // Fallback for legacy format (just a dictionary of points)
                var pointsOnly = JsonSerializer.Deserialize<Dictionary<string, Point3D>>(dataElement.GetRawText(), new JsonSerializerOptions { PropertyNameCaseInsensitive = true });
                return new MathSolverResponseDto { Points = pointsOnly };
            }
            
            // Final fallback check for root level format
            if (responseBodyString.Contains("\"sections\"") || responseBodyString.Contains("\"points\""))
            {
                 return JsonSerializer.Deserialize<MathSolverResponseDto>(responseBodyString, new JsonSerializerOptions { PropertyNameCaseInsensitive = true });
            }

            try {
                var pointsOnly = JsonSerializer.Deserialize<Dictionary<string, Point3D>>(responseBodyString, new JsonSerializerOptions { PropertyNameCaseInsensitive = true });
                return new MathSolverResponseDto { Points = pointsOnly };
            } catch {
                return null;
            }
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[AI_FALLBACK] Error calling solve-math: {ex.Message}");
            throw;
        }
    }

    private static string ExtractAiErrorMessage(string responseString, string fallbackMessage)
    {
        if (string.IsNullOrWhiteSpace(responseString))
            return fallbackMessage;

        try
        {
            using var document = JsonDocument.Parse(responseString);
            var root = document.RootElement;

            if (root.TryGetProperty("detail", out var detail))
            {
                if (detail.ValueKind == JsonValueKind.Object)
                {
                    if (detail.TryGetProperty("message", out var messageProp))
                    {
                        var message = messageProp.GetString();
                        if (!string.IsNullOrWhiteSpace(message))
                            return message;
                    }

                    return detail.GetRawText();
                }

                if (detail.ValueKind == JsonValueKind.String)
                {
                    var message = detail.GetString();
                    if (!string.IsNullOrWhiteSpace(message))
                        return message;
                }
            }

            if (root.TryGetProperty("message", out var rootMessage))
            {
                var message = rootMessage.GetString();
                if (!string.IsNullOrWhiteSpace(message))
                    return message;
            }
        }
        catch
        {
            // Fall back to raw text below.
        }

        return responseString.Trim();
    }
}
