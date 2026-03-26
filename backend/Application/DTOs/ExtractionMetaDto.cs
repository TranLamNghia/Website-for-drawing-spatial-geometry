using System.Text.Json.Serialization;

namespace Application.DTOs;

public class ExtractionMetaDto
{
    [JsonPropertyName("confidence")]
    public double? Confidence { get; set; }

    [JsonPropertyName("notes")]
    public string? Notes { get; set; }
}
