using System.Text.Json.Serialization;
using System.Collections.Generic;

namespace Application.DTOs;

public class SectionDataDto
{
    [JsonPropertyName("id")]
    public string Id { get; set; } = string.Empty;

    [JsonPropertyName("cuttingPlane")]
    public List<string> CuttingPlane { get; set; } = [];

    [JsonPropertyName("polygon")]
    public List<string> Polygon { get; set; } = [];

    [JsonPropertyName("generatedPoints")]
    public Dictionary<string, GeneratedPointDto>? GeneratedPoints { get; set; }
}

public class GeneratedPointDto
{
    [JsonPropertyName("x")]
    public double X { get; set; }

    [JsonPropertyName("y")]
    public double Y { get; set; }

    [JsonPropertyName("z")]
    public double Z { get; set; }
}
