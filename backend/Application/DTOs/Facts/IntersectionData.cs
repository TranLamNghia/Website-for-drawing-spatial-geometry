using System.Text.Json.Serialization;
using Application.DTOs.Enums;

namespace Application.DTOs.Facts;

public class IntersectionData
{
    [JsonPropertyName("objects")]
    public List<string> Objects { get; set; } = [];

    [JsonPropertyName("result")]
    public IntersectionResult Result { get; set; } = new();
}

public class IntersectionResult
{
    [JsonPropertyName("type")]
    public IntersectionResultType Type { get; set; }

    [JsonPropertyName("value")]
    public string? Value { get; set; }
}
