using System.Text.Json;
using System.Text.Json.Serialization;
using Application.DTOs.Enums;

namespace Application.DTOs;

public class QueryDto
{
    [JsonPropertyName("id")]
    public string Id { get; set; } = string.Empty;

    [JsonPropertyName("type")]
    public QueryType Type { get; set; }

    [JsonPropertyName("data")]
    public JsonElement Data { get; set; }

    [JsonPropertyName("raw_text")]
    public string RawText { get; set; } = string.Empty;

    /// <summary>
    /// Helper method to parse JsonElement into a specific Class DTO based on QueryType
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
