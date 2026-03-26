using System.Text;
using System.Text.Json;
using Application.DTOs;
using Application.Interfaces;

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
}