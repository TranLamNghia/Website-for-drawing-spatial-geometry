using System.Text.Json.Serialization;

namespace Application.DTOs.Facts;

public class InscribedData
{
    [JsonPropertyName("inner")]
    public string Inner { get; set; } = string.Empty;

    [JsonPropertyName("outer")]
    public string Outer { get; set; } = string.Empty;

    [JsonPropertyName("points")]
    public List<string>? Points { get; set; }
}
