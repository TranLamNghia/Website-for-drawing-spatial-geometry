using System.Text.Json;
using Application.Compilers;
using Application.Compilers.QueryHandlers;
using Application.Compilers.QueryValidators;
using Application.DTOs;
using Application.DTOs.Enums;
using Application.DTOs.Queries;
using Domains.MathCore;

namespace WebApi.Diagnostics;

public static class Batch5SmokeTests
{
    public static void Run()
    {
        var failures = new List<string>();
        var engine = CreateEngine();

        RunCase("ShapeQueryHandler + validator", () =>
        {
            var context = CreateContext(
                ("A", new Point3D(0, 0, 0)),
                ("B", new Point3D(4, 0, 0)),
                ("C", new Point3D(0, 4, 0)),
                ("S", new Point3D(0, 0, 3))
            );
            var problem = CreateProblem(
                CreateQuery("q-shape", QueryType.shape, new { solid = "SABC", plane = "ABC" })
            );

            new ShapeQueryHandler().Handle(problem.Queries[0], problem, context);
            var result = new ShapeQueryValidator().Validate(problem.Queries[0], problem, context, 5.0);
            AssertTrue(result.IsValid, "Shape query should validate");
        });

        RunCase("IntersectionLineQueryHandler + validator", () =>
        {
            var context = CreateContext(
                ("A", new Point3D(0, 0, 0)),
                ("B", new Point3D(1, 0, 0)),
                ("C", new Point3D(0, 1, 0)),
                ("D", new Point3D(0, 0, 1))
            );
            var problem = CreateProblem(
                CreateQuery("q-inter", QueryType.intersection_line, new { planes = new[] { "ABC", "ABD" } })
            );

            new IntersectionLineQueryHandler().Handle(problem.Queries[0], problem, context);
            AssertTrue(context.QueryResults.ContainsKey("q-inter:intersection_line"), "Intersection line should be stored");
            var result = new IntersectionLineQueryValidator().Validate(problem.Queries[0], problem, context, 5.0);
            AssertTrue(result.IsValid, "Intersection line query should validate");
        });

        RunCase("EquationLineQueryHandler + validator", () =>
        {
            var context = CreateContext(
                ("A", new Point3D(0, 0, 0)),
                ("B", new Point3D(1, 0, 0))
            );
            var problem = CreateProblem(
                CreateQuery("q-eq-line", QueryType.equation_line, new { target = "AB" })
            );

            new EquationLineQueryHandler().Handle(problem.Queries[0], problem, context);
            AssertTrue(context.QueryResults.ContainsKey("q-eq-line:equation"), "Line equation should be stored");
            var result = new EquationLineQueryValidator().Validate(problem.Queries[0], problem, context, 5.0);
            AssertTrue(result.IsValid, "Equation line query should validate");
        });

        RunCase("EquationPlaneQueryHandler + validator", () =>
        {
            var context = CreateContext(
                ("A", new Point3D(0, 0, 0)),
                ("B", new Point3D(1, 0, 0)),
                ("C", new Point3D(0, 1, 0))
            );
            var problem = CreateProblem(
                CreateQuery("q-eq-plane", QueryType.equation_plane, new { target = "ABC" })
            );

            new EquationPlaneQueryHandler().Handle(problem.Queries[0], problem, context);
            AssertTrue(context.QueryResults.ContainsKey("q-eq-plane:equation"), "Plane equation should be stored");
            var result = new EquationPlaneQueryValidator().Validate(problem.Queries[0], problem, context, 5.0);
            AssertTrue(result.IsValid, "Equation plane query should validate");
        });

        RunCase("EquationSphereQueryHandler + validator", () =>
        {
            var context = CreateContext(("O", new Point3D(0, 0, 0)));
            context.Spheres.Add(new SphereData { Center = "O", Radius = 5 });
            var problem = CreateProblem(
                CreateQuery("q-eq-sphere", QueryType.equation_sphere, new { target = "O" })
            );

            new EquationSphereQueryHandler().Handle(problem.Queries[0], problem, context);
            AssertTrue(context.QueryResults.ContainsKey("q-eq-sphere:equation"), "Sphere equation should be stored");
            var result = new EquationSphereQueryValidator().Validate(problem.Queries[0], problem, context, 5.0);
            AssertTrue(result.IsValid, "Equation sphere query should validate");
        });

        RunCase("CoordinatesQueryHandler + validator", () =>
        {
            var context = CreateContext(("A", new Point3D(1, 2, 3)));
            var problem = CreateProblem(
                CreateQuery("q-coord", QueryType.coordinates, new { target = "A" })
            );

            new CoordinatesQueryHandler().Handle(problem.Queries[0], problem, context);
            AssertTrue(context.QueryResults.ContainsKey("q-coord:coordinates"), "Coordinates should be stored");
            var result = new CoordinatesQueryValidator().Validate(problem.Queries[0], problem, context, 5.0);
            AssertTrue(result.IsValid, "Coordinates query should validate");
        });

        RunCase("LocusQueryHandler + validator", () =>
        {
            var context = CreateContext();
            var problem = CreateProblem(
                CreateQuery("q-locus", QueryType.locus, new { target = "circle_center_O" })
            );

            new LocusQueryHandler().Handle(problem.Queries[0], problem, context);
            var result = new LocusQueryValidator().Validate(problem.Queries[0], problem, context, 5.0);
            AssertTrue(result.IsValid, "Locus query should validate");
        });

        RunCase("ProofParallelQueryHandler + validator", () =>
        {
            var context = CreateContext(
                ("A", new Point3D(0, 0, 0)),
                ("B", new Point3D(1, 0, 0)),
                ("C", new Point3D(0, 2, 0)),
                ("D", new Point3D(1, 2, 0))
            );
            var problem = CreateProblem(
                CreateQuery("q-proof-par", QueryType.proof_parallel, new { objects = new[] { "AB", "CD" } })
            );

            new ProofParallelQueryHandler().Handle(problem.Queries[0], problem, context);
            var result = new ProofParallelQueryValidator().Validate(problem.Queries[0], problem, context, 5.0);
            AssertTrue(result.IsValid, "Proof parallel query should validate");
        });

        RunCase("ProofPerpendicularQueryHandler + validator", () =>
        {
            var context = CreateContext(
                ("A", new Point3D(0, 0, 0)),
                ("B", new Point3D(1, 0, 0)),
                ("C", new Point3D(0, 1, 0)),
                ("D", new Point3D(0, 2, 0))
            );
            var problem = CreateProblem(
                CreateQuery("q-proof-perp", QueryType.proof_perpendicular, new { objects = new[] { "AB", "CD" } })
            );

            new ProofPerpendicularQueryHandler().Handle(problem.Queries[0], problem, context);
            var result = new ProofPerpendicularQueryValidator().Validate(problem.Queries[0], problem, context, 5.0);
            AssertTrue(result.IsValid, "Proof perpendicular query should validate");
        });

        RunCase("ProofEqualQueryHandler + validator", () =>
        {
            var context = CreateContext(
                ("A", new Point3D(0, 0, 0)),
                ("B", new Point3D(4, 0, 0)),
                ("C", new Point3D(0, 3, 0)),
                ("D", new Point3D(4, 3, 0))
            );
            var problem = CreateProblem(
                CreateQuery("q-proof-eq", QueryType.proof_equal, new { objects = new[] { "AB", "CD" } })
            );

            new ProofEqualQueryHandler().Handle(problem.Queries[0], problem, context);
            var result = new ProofEqualQueryValidator().Validate(problem.Queries[0], problem, context, 5.0);
            AssertTrue(result.IsValid, "Proof equal query should validate");
        });

        RunCase("CosineBetweenPlanesQueryHandler + validator", () =>
        {
            var context = CreateContext(
                ("A", new Point3D(0, 0, 0)),
                ("B", new Point3D(1, 0, 0)),
                ("C", new Point3D(0, 1, 0)),
                ("D", new Point3D(0, 0, 1)),
                ("E", new Point3D(1, 0, 1)),
                ("F", new Point3D(0, 1, 1))
            );
            var problem = CreateProblem(
                CreateQuery("q-cos", QueryType.cosine_between_planes, new { planes = new[] { "ABC", "DEF" } })
            );

            new CosineBetweenPlanesQueryHandler().Handle(problem.Queries[0], problem, context);
            AssertTrue(context.QueryResults.ContainsKey("q-cos:cosine"), "Cosine should be stored");
            var result = new CosineBetweenPlanesQueryValidator().Validate(problem.Queries[0], problem, context, 5.0);
            AssertTrue(result.IsValid, "Cosine between planes query should validate");
        });

        RunCase("SineBetweenLineAndPlaneQueryHandler + validator", () =>
        {
            var context = CreateContext(
                ("A", new Point3D(0, 0, 0)),
                ("B", new Point3D(0, 0, 1)),
                ("C", new Point3D(1, 0, 0)),
                ("D", new Point3D(0, 1, 0))
            );
            var problem = CreateProblem(
                CreateQuery("q-sin", QueryType.sine_between_line_and_plane, new { objects = new[] { "AB", "ACD" } })
            );

            new SineBetweenLineAndPlaneQueryHandler().Handle(problem.Queries[0], problem, context);
            AssertTrue(context.QueryResults.ContainsKey("q-sin:sine"), "Sine should be stored");
            var result = new SineBetweenLineAndPlaneQueryValidator().Validate(problem.Queries[0], problem, context, 5.0);
            AssertTrue(result.IsValid, "Sine between line and plane query should validate");
        });

        RunCase("RatioVolumeQueryHandler + validator", () =>
        {
            var context = CreateContext(
                ("S", new Point3D(0, 0, 3)),
                ("A", new Point3D(0, 0, 0)),
                ("B", new Point3D(4, 0, 0)),
                ("C", new Point3D(0, 4, 0)),
                ("S2", new Point3D(0, 0, 6)),
                ("A2", new Point3D(0, 0, 0)),
                ("B2", new Point3D(2, 0, 0)),
                ("C2", new Point3D(0, 2, 0))
            );
            var problem = CreateProblem(
                CreateQuery("q-ratio-v", QueryType.ratio_volume, new { solids = new[] { "SABC", "S2A2B2C2" } })
            );

            new RatioVolumeQueryHandler().Handle(problem.Queries[0], problem, context);
            var result = new RatioVolumeQueryValidator().Validate(problem.Queries[0], problem, context, 5.0);
            AssertTrue(result.IsValid, "Ratio volume query should validate");
        });

        RunCase("QueryProcessingEngine end-to-end", () =>
        {
            var context = CreateContext(
                ("A", new Point3D(0, 0, 0)),
                ("B", new Point3D(1, 0, 0)),
                ("C", new Point3D(0, 1, 0))
            );
            var problem = CreateProblem(
                CreateQuery("q1", QueryType.equation_plane, new { target = "ABC" }),
                CreateQuery("q2", QueryType.coordinates, new { target = "A" })
            );

            var report = engine.Process(problem, context);
            AssertTrue(report.AllPassed, "Query processing engine should pass all queries");
        });

        if (failures.Count > 0)
        {
            throw new InvalidOperationException("Batch5 smoke tests failed:\n" + string.Join("\n", failures));
        }

        Console.WriteLine("[BATCH5] All smoke tests passed.");

        void RunCase(string name, Action test)
        {
            try
            {
                test();
                Console.WriteLine($"[BATCH5] PASS: {name}");
            }
            catch (Exception ex)
            {
                failures.Add($"{name}: {ex.Message}");
                Console.WriteLine($"[BATCH5] FAIL: {name} -> {ex.Message}");
            }
        }
    }

    private static QueryProcessingEngine CreateEngine()
    {
        IEnumerable<IQueryHandler> handlers =
        [
            new ShapeQueryHandler(),
            new IntersectionLineQueryHandler(),
            new EquationLineQueryHandler(),
            new EquationPlaneQueryHandler(),
            new EquationSphereQueryHandler(),
            new CoordinatesQueryHandler(),
            new LocusQueryHandler(),
            new ProofParallelQueryHandler(),
            new ProofPerpendicularQueryHandler(),
            new ProofEqualQueryHandler(),
            new CosineBetweenPlanesQueryHandler(),
            new SineBetweenLineAndPlaneQueryHandler(),
            new RatioVolumeQueryHandler()
        ];

        IEnumerable<IQueryValidator> validators =
        [
            new ShapeQueryValidator(),
            new IntersectionLineQueryValidator(),
            new EquationLineQueryValidator(),
            new EquationPlaneQueryValidator(),
            new EquationSphereQueryValidator(),
            new CoordinatesQueryValidator(),
            new LocusQueryValidator(),
            new ProofParallelQueryValidator(),
            new ProofPerpendicularQueryValidator(),
            new ProofEqualQueryValidator(),
            new CosineBetweenPlanesQueryValidator(),
            new SineBetweenLineAndPlaneQueryValidator(),
            new RatioVolumeQueryValidator()
        ];

        return new QueryProcessingEngine(handlers, validators);
    }

    private static CompilationContext CreateContext(params (string Name, Point3D Point)[] points)
    {
        var context = new CompilationContext();
        foreach (var (name, point) in points)
        {
            context.Points[name] = point;
        }
        return context;
    }

    private static GeometryProblemDto CreateProblem(params QueryDto[] queries)
    {
        return new GeometryProblemDto
        {
            Entities = new EntitiesDto(),
            Facts = [],
            Queries = queries.ToList()
        };
    }

    private static QueryDto CreateQuery(string id, QueryType type, object data)
    {
        return new QueryDto
        {
            Id = id,
            Type = type,
            Data = JsonSerializer.SerializeToElement(data),
            RawText = id
        };
    }

    private static void AssertTrue(bool condition, string message)
    {
        if (!condition)
        {
            throw new InvalidOperationException(message);
        }
    }
}
