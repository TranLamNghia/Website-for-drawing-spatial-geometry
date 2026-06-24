using System;
using System.Collections.Generic;
using System.Linq;
using Application.Compilers;
using Application.Compilers.FactHandlers;
using Application.Compilers.FactValidators;
using Application.Compilers.QueryHandlers;
using Application.Compilers.QueryValidators;
using Application.DTOs;
using Application.DTOs.Enums;
using Application.DTOs.Facts;
using Domains.MathCore;
using System.Text.Json;

namespace WebApi.Diagnostics;

public static class Batch2SmokeTests
{
    public static void Run()
    {
        var failures = new List<string>();

        RunCase("Đề 2 - chóp S.ABCD, MN // (SAB), M∈SD, N∈SC", () =>
        {
            var problem = CreateProblem(
                ["S", "A", "B", "C", "D", "M", "N"],
                ["MN", "SD", "SC", "SA", "SB", "AB", "BC", "CD", "DA"],
                ["SAB"],
                ["S.ABCD"],
                CreateFact("s1", FactType.Shape, new ShapeData { Target = "S.ABCD", Shape = ShapeType.Pyramid }),
                CreateFact("p1", FactType.Parallel, new ObjectsData { Objects = ["MN", "SAB"] }),
                CreateFact("b1", FactType.belongs_to, new BelongsToData { Point = "M", Target = "SD" }),
                CreateFact("b2", FactType.belongs_to, new BelongsToData { Point = "N", Target = "SC" })
            );

            var context = CompileProblem(problem);
            var integrity = PointIntegrityHelper.Evaluate(problem.Entities.Points, context.Points);
            AssertTrue(integrity.IsValid, "Points should match entities");

            AssertTrue(context.Points.ContainsKey("S") && context.Points["S"].Z > 0.5, "Apex S should be above base");
            AssertTrue(context.Points.ContainsKey("M") && context.Points.ContainsKey("N"), "M and N required");

            var s = context.Points["S"];
            var d = context.Points["D"];
            var c = context.Points["C"];
            var m = context.Points["M"];
            var n = context.Points["N"];

            var lineSd = new Line3D(s, d);
            var lineSc = new Line3D(s, c);
            AssertTrue(lineSd.DistanceToPoint(m) < 0.05, "M must lie on SD");
            AssertTrue(lineSc.DistanceToPoint(n) < 0.05, "N must lie on SC");

            var planeSab = context.GetPlane("SAB");
            AssertTrue(planeSab != null, "Plane SAB required");
            var mnDir = new Vector3D(m, n);
            AssertTrue(Math.Abs(mnDir.DotProduct(planeSab!.Normal)) < 0.1, "MN should be parallel to plane SAB");

            AssertTrue(context.ValidationReport?.AllPassed == true, "Validation should pass");
        });

        RunCase("Đề 4 - tam giác vuông tại B (không vuông cân)", () =>
        {
            var problem = CreateProblem(
                ["A", "B", "C", "D"],
                ["AB", "BC", "CA", "BD", "AC"],
                [],
                [],
                CreateFact("s1", FactType.Shape, new ShapeData { Target = "ABC", Shape = ShapeType.Right_triangle },
                    "Cho tam giác ABC vuông tại B"),
                CreateFact("p1", FactType.Perpendicular, new ObjectsData { Objects = ["BD", "AC"] },
                    "BD ⊥ AC")
            );
            var context = CompileProblem(problem);
            AssertTrue(context.Points.ContainsKey("A") && context.Points.ContainsKey("B") && context.Points.ContainsKey("C"),
                "Triangle vertices required");

            var a = context.Points["A"];
            var b = context.Points["B"];
            var c = context.Points["C"];
            var ab = a.DistanceToPoint(b);
            var bc = b.DistanceToPoint(c);
            AssertTrue(Math.Abs(ab - bc) > 0.5, "Right triangle at B should not default to isosceles legs");

            var ba = new Vector3D(b, a);
            var bcDir = new Vector3D(b, c);
            AssertTrue(Math.Abs(ba.DotProduct(bcDir)) < 1e-2, "Angle at B should be 90°");

            AssertTrue(context.ValidationReport?.AllPassed == true,
                $"Validation should pass without sympy fallback (failures: {context.ValidationReport?.TotalFailed})");
            AssertTrue(context.Points.ContainsKey("D"), "Foot point D should be placed");
        });

        RunCase("Đề 11 - đường thẳng AB, C trên tia đối AB", () =>
        {
            var problem = CreateProblem(
                ["A", "B", "C"],
                ["AB"],
                [],
                [],
                CreateFact("or1", FactType.Opposite_ray, new OppositeRayData
                {
                    Point = "C",
                    Origin = "A",
                    RayPoint = "B"
                }, "Gọi C là một điểm trên tia đối của AB")
            );

            var context = CompileProblem(problem);
            var integrity = PointIntegrityHelper.Evaluate(problem.Entities.Points, context.Points);
            AssertTrue(integrity.IsValid, "Points should match entities");

            AssertTrue(context.Points.ContainsKey("A") && context.Points.ContainsKey("B") && context.Points.ContainsKey("C"),
                "A, B, C required");

            var a = context.Points["A"];
            var b = context.Points["B"];
            var c = context.Points["C"];

            var abDir = new Vector3D(a, b);
            var acDir = new Vector3D(a, c);
            AssertTrue(abDir.Magnitude() > 1e-3 && acDir.Magnitude() > 1e-3, "AB and AC must be non-degenerate");
            AssertTrue(Math.Abs(abDir.DotProduct(acDir)) > 0.5 * abDir.Magnitude() * acDir.Magnitude(),
                "C should lie on the line through A collinear with AB");
            AssertTrue(abDir.DotProduct(acDir) < 0, "C should be on the opposite ray from B");

            AssertTrue(context.ValidationReport?.AllPassed == true, "Validation should pass");
        });

        if (failures.Count > 0)
        {
            throw new InvalidOperationException(
                "Batch 2 smoke tests failed:\n" + string.Join("\n", failures.Select(f => "- " + f)));
        }

        Console.WriteLine("All batch 2 smoke tests passed.");

        void RunCase(string name, Action test)
        {
            try
            {
                test();
                Console.WriteLine($"[PASS] {name}");
            }
            catch (Exception ex)
            {
                failures.Add($"{name}: {ex.Message}");
                Console.WriteLine($"[FAIL] {name} -> {ex.Message}");
            }
        }
    }

    private static void AssertTrue(bool condition, string message)
    {
        if (!condition) throw new InvalidOperationException(message);
    }

    private static FactDto CreateFact<T>(string id, FactType type, T data, string? rawText = null)
    {
        return new FactDto
        {
            Id = id,
            Type = type,
            Data = JsonSerializer.SerializeToElement(data),
            RawText = rawText ?? string.Empty
        };
    }

    private static GeometryProblemDto CreateProblem(
        List<string> points,
        List<string> segments,
        List<string> planes,
        List<string> solids,
        params FactDto[] facts)
    {
        return new GeometryProblemDto
        {
            Entities = new EntitiesDto
            {
                Points = points,
                Segments = segments,
                Planes = planes,
                Solids = solids
            },
            Facts = facts.ToList()
        };
    }

    private static CompilationContext CompileProblem(GeometryProblemDto problem)
    {
        IFactHandler[] handlers =
        [
            new MidpointHandler(), new CentroidHandler(), new IntersectionHandler(), new ProjectionHandler(),
            new RatioHandler(), new BelongsToHandler(), new CircumcenterHandler(), new IncenterHandler(),
            new OrthocenterHandler(), new CircumscribedHandler(), new InscribedHandler(), new ParallelHandler(),
            new PerpendicularHandler(), new AngleHandler(), new LengthHandler(), new OppositeRayHandler(),
            new RayHandler(), new PerpendicularRayHandler(), new AngleBisectorHandler(), new ShapeHandler(),
            new AreaHandler(), new PerimeterHandler(), new VolumeHandler(), new DistanceHandler(),
            new EqualityHandler(), new CoplanarHandler(), new CollinearHandler(), new TangentHandler()
        ];

        IFactValidator[] validators =
        [
            new LengthValidator(), new AreaValidator(), new DistanceValidator(), new AngleValidator(),
            new ParallelValidator(), new PerpendicularValidator(), new CentroidValidator(), new MidpointValidator(),
            new ProjectionValidator(), new RatioValidator(), new ShapeValidator(), new CircumcenterValidator(),
            new IncenterValidator(), new OrthocenterValidator(), new CircumscribedValidator(), new InscribedValidator(),
            new PerimeterValidator(), new VolumeValidator(), new EqualityValidator(), new CoplanarValidator(),
            new CollinearValidator(), new BelongsToValidator(), new TangentValidator()
        ];

        IQueryHandler[] queryHandlers =
        [
            new ShapeQueryHandler(), new IntersectionLineQueryHandler(), new EquationLineQueryHandler(),
            new EquationPlaneQueryHandler(), new EquationSphereQueryHandler(), new CoordinatesQueryHandler(),
            new LocusQueryHandler(), new ProofParallelQueryHandler(), new ProofPerpendicularQueryHandler(),
            new ProofEqualQueryHandler(), new CosineBetweenPlanesQueryHandler(), new SineBetweenLineAndPlaneQueryHandler(),
            new RatioVolumeQueryHandler()
        ];

        IQueryValidator[] queryValidators =
        [
            new ShapeQueryValidator(), new IntersectionLineQueryValidator(), new EquationLineQueryValidator(),
            new EquationPlaneQueryValidator(), new EquationSphereQueryValidator(), new CoordinatesQueryValidator(),
            new LocusQueryValidator(), new ProofParallelQueryValidator(), new ProofPerpendicularQueryValidator(),
            new ProofEqualQueryValidator(), new CosineBetweenPlanesQueryValidator(), new SineBetweenLineAndPlaneQueryValidator(),
            new RatioVolumeQueryValidator()
        ];

        var compiler = new GeometryCompiler(
            handlers,
            new FactValidationEngine(validators),
            new QueryProcessingEngine(queryHandlers, queryValidators));

        return compiler.Compile(problem);
    }
}
