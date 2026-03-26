using System.Text.Json;
using System.Text.Json.Serialization;
using Application.DTOs.Enums;

namespace Application.DTOs;

public class GeometryProblemDto
{
    [JsonPropertyName("metadata")]
    public MetadataDto Metadata { get; set; } = new();

    [JsonPropertyName("entities")]
    public EntitiesDto Entities { get; set; } = new();

    [JsonPropertyName("facts")]
    public List<FactDto> Facts { get; set; } = [];

    [JsonPropertyName("queries")]
    public List<QueryDto> Queries { get; set; } = [];

    [JsonPropertyName("extraction_meta")]
    public ExtractionMetaDto? ExtractionMeta { get; set; }
}
