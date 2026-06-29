using System.Text.Json.Serialization;
using Application.DTOs.Enums;

namespace Application.DTOs.Facts;

public class VolumeData
{
    [JsonPropertyName("target")]
    public string Target { get; set; } = string.Empty;

    [JsonPropertyName("shape")]
    public ShapeType Shape { get; set; }

    [JsonPropertyName("value")]
    public string Value { get; set; } = string.Empty;

    [JsonPropertyName("center")]
    public string? Center { get; set; }

    [JsonPropertyName("apex")]
    public string? Apex { get; set; }

    [JsonPropertyName("points")]
    public List<string>? Points { get; set; }

    [JsonPropertyName("radius")]
    public string? Radius { get; set; }

    [JsonPropertyName("height")]
    public string? Height { get; set; }
}
