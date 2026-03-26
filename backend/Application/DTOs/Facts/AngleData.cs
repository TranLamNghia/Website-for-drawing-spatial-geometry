using System.Text.Json.Serialization;
using Application.DTOs.Enums;

namespace Application.DTOs.Facts;

public class AngleData
{
    [JsonPropertyName("angle_type")]
    public AngleType AngleType { get; set; }

    [JsonPropertyName("objects")]
    public List<string> Objects { get; set; } = [];

    [JsonPropertyName("value")]
    public string Value { get; set; } = string.Empty;
}
