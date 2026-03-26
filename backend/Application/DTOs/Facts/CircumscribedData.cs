using System.Text.Json.Serialization;

namespace Application.DTOs.Facts;

public class CircumscribedData
{
    [JsonPropertyName("outer")]
    public string Outer { get; set; } = string.Empty;

    [JsonPropertyName("inner")]
    public string? Inner { get; set; }

    [JsonPropertyName("points")]
    public List<string>? Points { get; set; }
}
