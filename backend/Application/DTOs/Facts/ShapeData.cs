using System.Text.Json.Serialization;
using Application.DTOs.Enums;

namespace Application.DTOs.Facts;

public class ShapeData
{
    [JsonPropertyName("target")]
    public string Target { get; set; } = string.Empty;

    [JsonPropertyName("shape")]
    public ShapeType Shape { get; set; }

    [JsonPropertyName("center")]
    public string? Center { get; set; }

    [JsonPropertyName("radius")]
    public string? Radius { get; set; }

    [JsonPropertyName("points")]
    public List<string>? Points { get; set; }
}
