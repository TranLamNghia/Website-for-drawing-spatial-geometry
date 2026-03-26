using System.Text.Json;
using System.Text.Json.Serialization;
using Application.DTOs.Enums;

namespace Application.DTOs;

/// <summary>
/// DTO for each Fact in the geometry problem.
/// Field Data use JsonElement because the structure changes depending on the Type.
/// </summary>
public class FactDto
{
    [JsonPropertyName("id")]
    public string Id { get; set; } = string.Empty;

    [JsonPropertyName("type")]
    public FactType Type { get; set; }

    [JsonPropertyName("data")]
    public JsonElement Data { get; set; }

    [JsonPropertyName("raw_text")]
    public string RawText { get; set; } = string.Empty;

    /// <summary>
    /// Helper method to parse JsonElement into a specific Class DTO based on FactType
    /// </summary>
    public T? GetDataAs<T>() where T : class
    {
        try
        {
            var options = new JsonSerializerOptions { PropertyNameCaseInsensitive = true };
            return Data.Deserialize<T>(options);
        }
        catch
        {
            return null;
        }
    }
}
