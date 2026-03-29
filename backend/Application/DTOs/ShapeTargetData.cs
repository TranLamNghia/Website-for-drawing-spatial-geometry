using System.Text.Json.Serialization;

namespace Application.DTOs;

public class ShapeTargetData
{
    [JsonPropertyName("point")]
    public string Point { get; set; } = string.Empty;
    [JsonPropertyName("shape")]
    public string Shape { get; set; } = string.Empty;
}