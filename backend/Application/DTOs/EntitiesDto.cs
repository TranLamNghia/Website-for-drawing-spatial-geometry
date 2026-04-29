using System.Text.Json.Serialization;

namespace Application.DTOs;

public class EntitiesDto
{
    [JsonPropertyName("points")]
    public List<string> Points { get; set; } = [];

    [JsonPropertyName("segments")]
    public List<string> Segments { get; set; } = [];

    [JsonPropertyName("rays")]
    public List<string> Rays { get; set; } = [];

    [JsonPropertyName("vectors")]
    public List<string> Vectors { get; set; } = [];

    [JsonPropertyName("planes")]
    public List<string> Planes { get; set; } = [];

    [JsonPropertyName("solids")]
    public List<string> Solids { get; set; } = [];

    [JsonPropertyName("sections")]
    public List<SectionDataDto> Sections { get; set; } = [];
}
