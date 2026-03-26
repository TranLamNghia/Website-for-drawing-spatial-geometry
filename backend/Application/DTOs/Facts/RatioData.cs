using System.Text.Json.Serialization;

namespace Application.DTOs.Facts;

public class RatioData
{
    [JsonPropertyName("segment_1")]
    public string Segment1 { get; set; } = string.Empty;

    [JsonPropertyName("segment_2")]
    public string Segment2 { get; set; } = string.Empty;

    [JsonPropertyName("value")]
    public string Value { get; set; } = string.Empty;
}
