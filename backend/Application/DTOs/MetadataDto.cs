using System.Text.Json.Serialization;
using Application.DTOs.Enums;

namespace Application.DTOs;

public class MetadataDto
{
    [JsonPropertyName("problem_id")]
    public string ProblemId { get; set; } = string.Empty;

    [JsonPropertyName("topic")]
    public TopicType? Topic { get; set; }

    [JsonPropertyName("language")]
    public string? Language { get; set; }
}
