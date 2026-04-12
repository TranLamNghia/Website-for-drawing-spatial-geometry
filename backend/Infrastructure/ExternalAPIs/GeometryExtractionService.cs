using System.Text;
using System.Text.Json;
using Application.DTOs;
using Application.Interfaces;
using Domains.MathCore;

namespace Infrastructure.ExternalAPIs;

public class GeometryExtractionService : IGeometryExtractionService
{
    private readonly HttpClient _httpClient;

    public GeometryExtractionService(HttpClient httpClient)
    {
        _httpClient = httpClient;
        _httpClient.BaseAddress = new Uri("http://localhost:8000/api/");
    }

    public async Task<GeometryProblemDto?> ExtractGeometryAsync(string problemText)
    {
        var requestBody = new { problem_text = problemText };
        var jsonContent = new StringContent(JsonSerializer.Serialize(requestBody), Encoding.UTF8, "application/json");

        var response = await _httpClient.PostAsync("extract", jsonContent);
        
        if (!response.IsSuccessStatusCode)
            throw new Exception("Error when calling Python AI Service.");

        var responseString = await response.Content.ReadAsStringAsync();
        using var document = JsonDocument.Parse(responseString);
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

    public async Task<Dictionary<string, Point3D>?> FallbackSolveMathAsync(MathSolverRequestDto request)
    {
        var options = new JsonSerializerOptions { PropertyNamingPolicy = JsonNamingPolicy.CamelCase };
        var jsonContent = new StringContent(JsonSerializer.Serialize(request, options), Encoding.UTF8, "application/json");

        try
        {
            var response = await _httpClient.PostAsync("solve-math", jsonContent);
            
            if (!response.IsSuccessStatusCode)
            {
                var errStr = await response.Content.ReadAsStringAsync();
                throw new Exception($"Math Sandbox Error: {errStr}");
            }

            var responseString = await response.Content.ReadAsStringAsync();
            using var document = JsonDocument.Parse(responseString);
            
            if (document.RootElement.TryGetProperty("data", out var dataElement))
            {
                // Check if data is an error message instead of point coordinates
                if (dataElement.ValueKind == JsonValueKind.Object && dataElement.TryGetProperty("STATUS", out var status) && status.GetString() == "ERROR")
                {
                    string msg = dataElement.TryGetProperty("ERROR_MESSAGE", out var m) ? m.GetString() : "Unknown SymPy Error";
                    Console.WriteLine($"[AI_FALLBACK] SymPy failed: {msg}");
                    return null;
                }

                var result = JsonSerializer.Deserialize<Dictionary<string, Point3D>>(dataElement.GetRawText(), new JsonSerializerOptions { PropertyNameCaseInsensitive = true });
                return result;
            }
            
            // Final fallback check: if no "data" property, try checking the root for errors
            string rawStr = document.RootElement.GetRawText();
            if (rawStr.Contains("\"ERROR\"") || rawStr.Contains("\"status\":\"error\"") || rawStr.Contains("\"status\": \"error\""))
            {
                return null;
            }

            try {
                return JsonSerializer.Deserialize<Dictionary<string, Point3D>>(responseString, new JsonSerializerOptions { PropertyNameCaseInsensitive = true });
            } catch {
                return null;
            }
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[AI_FALLBACK] Error calling solve-math: {ex.Message}");
            return null;
        }
    }
}