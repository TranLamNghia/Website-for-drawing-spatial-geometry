using System.Text.Json.Serialization;

namespace Application.DTOs.Facts;

public class EqualityData
{
    [JsonPropertyName("left")]
    public string? Left { get; set; }

    [JsonPropertyName("right")]
    public string? Right { get; set; }

    [JsonPropertyName("objects")]
    public List<string>? Objects { get; set; }

    [JsonPropertyName("value")]
    public string? Value { get; set; }
}
