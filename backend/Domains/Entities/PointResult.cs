using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

namespace Domains.Entities
{
    public class PointResult
    {
        [BsonId]
        [BsonRepresentation(BsonType.ObjectId)]
        public string? Id { get; set; }

        [BsonElement("message")]
        public string Message { get; set; } = null!;

        [BsonElement("points")]
        public Dictionary<string, Coordinate> Points { get; set; } = new();

        [BsonElement("segments")]
        public List<string> Segments { get; set; } = new();

        [BsonElement("planes")]
        public List<PlaneResult> Planes { get; set; } = new();

        [BsonElement("circles")]
        public List<CircleResult> Circles { get; set; } = new();

        [BsonElement("spheres")]
        public List<object> Spheres { get; set; } = new();

        [BsonElement("validation")]
        public ValidationSummary Validation { get; set; } = null!;
    }

    public class Coordinate
    {
        [BsonElement("x")]
        public double X { get; set; }

        [BsonElement("y")]
        public double Y { get; set; }

        [BsonElement("z")]
        public double Z { get; set; }
    }

    public class PlaneResult
    {
        [BsonElement("points")]
        public List<string> Points { get; set; } = new();

        [BsonElement("color")]
        public string Color { get; set; } = "#6671d1";

        [BsonElement("density")]
        public int Density { get; set; }

        [BsonElement("opacity")]
        public double Opacity { get; set; }
    }

    public class CircleResult
    {
        [BsonElement("center")]
        public string Center { get; set; } = null!;

        [BsonElement("radius")]
        public double Radius { get; set; }

        [BsonElement("normal")]
        public List<double> Normal { get; set; } = new();

        [BsonElement("color")]
        public string Color { get; set; } = "#22B14C";
    }

    public class ValidationSummary
    {
        [BsonElement("allPassed")]
        public bool AllPassed { get; set; }

        [BsonElement("totalChecked")]
        public int TotalChecked { get; set; }

        [BsonElement("totalPassed")]
        public int TotalPassed { get; set; }

        [BsonElement("totalFailed")]
        public int TotalFailed { get; set; }

        [BsonElement("totalSkipped")]
        public int TotalSkipped { get; set; }

        [BsonElement("failures")]
        public List<string> Failures { get; set; } = new();
    }
}