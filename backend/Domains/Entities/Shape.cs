using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

namespace Domains.Entities
{
    public class Shape
    {
        [BsonId]
        [BsonRepresentation(BsonType.ObjectId)]
        public string Id { get; set; } = string.Empty;

        [BsonElement("problem_id")]
        public string ProblemId { get; set; } = null!;

        [BsonElement("status")]
        public string Status { get; set; } = string.Empty;

        [BsonElement("data")]
        public string Data { get; set; } = string.Empty;
    }

    public class ProblemData
    {
        [BsonElement("metadata")]
        public Metadata Metadata { get; set; } = new();

        [BsonElement("entities")]
        public Entities Entities { get; set; } = new();

        [BsonElement("facts")]
        public List<Fact> Facts { get; set; } = [];

        [BsonElement("queries")]
        public List<Query> Queries { get; set; } = [];
    }

    public class Metadata
    {
        [BsonElement("problem_id")]
        public string ProblemId { get; set; } = string.Empty;
    }

    public class Entities
    {
        [BsonElement("points")]
        public List<string> Points { get; set; } = [];

        [BsonElement("segments")]
        public List<string> Segments { get; set; } = [];

        [BsonElement("rays")]
        public List<string> Rays { get; set; } = [];

        [BsonElement("vectors")]
        public List<string> Vectors { get; set; } = [];

        [BsonElement("planes")]
        public List<string> Planes { get; set; } = [];

        [BsonElement("circles")]
        public List<string> Circles { get; set; } = [];

        [BsonElement("spheres")]
        public List<string> Spheres { get; set; } = [];

        [BsonElement("solids")]
        public List<string> Solids { get; set; } = [];
    }

    public class Fact
    {
        [BsonElement("id")]
        public string Id { get; set; } = string.Empty;
        [BsonElement("type")]
        public string Type { get; set; } = string.Empty;
        [BsonElement("data")]
        public Dictionary<string, object> Data { get; set; } = [];
        [BsonElement("raw_text")]
        public string RawText { get; set; } = string.Empty;
    }

    public class Query
    {
        [BsonElement("id")]
        public string Id { get; set; } = string.Empty;
        [BsonElement("type")]
        public string Type { get; set; } = string.Empty;
        [BsonElement("data")]
        public Dictionary<string, object> Data { get; set; } = [];
    }
}