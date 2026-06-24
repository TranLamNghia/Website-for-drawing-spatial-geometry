using System.Text.Json.Serialization;

namespace Application.DTOs.Facts;

public class PerimeterData
{
    [JsonPropertyName("target")]
    public string Target { get; set; } = string.Empty;

    [JsonPropertyName("value")]
    public string Value { get; set; } = string.Empty;
}
