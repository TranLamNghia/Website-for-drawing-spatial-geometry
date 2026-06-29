using System.Text.Json;
using Application.Compilers;
using Application.Compilers.FactHandlers;
using Application.Compilers.FactValidators;
using Application.Compilers.QueryHandlers;
using Application.Compilers.QueryValidators;
using Application.DTOs;
using Application.DTOs.Enums;
using Application.DTOs.Facts;
using Domains.MathCore;

namespace WebApi.Diagnostics;

public static class Batch1SmokeTests
{
    public static void Run()
    {
        var failures = new List<string>();

        RunCase("ShapeValidator - rectangle", () =>
        {
            var context = CreateContext(
                ("A", new Point3D(0, 0, 0)),
                ("B", new Point3D(4, 0, 0)),
                ("C", new Point3D(4, 2, 0)),
                ("D", new Point3D(0, 2, 0))
            );

            var fact = CreateFact("shape-rect", FactType.Shape, new ShapeData
            {
                Target = "ABCD",
                Shape = ShapeType.Rectangle
            });

            var result = new ShapeValidator().Validate(fact, context, 5.0);
            AssertTrue(result.IsValid, "Rectangle should validate");
        });

        RunCase("ShapeValidator - solid pass", () =>
        {
            var context = CreateContext(
                ("A", new Point3D(0, 0, 0)),
                ("B", new Point3D(1, 0, 0)),
                ("C", new Point3D(1, 1, 0)),
                ("D", new Point3D(0, 1, 0)),
                ("A'", new Point3D(0, 0, 2)),
                ("B'", new Point3D(1, 0, 2)),
                ("C'", new Point3D(1, 1, 2)),
                ("D'", new Point3D(0, 1, 2))
            );

            var fact = CreateFact("shape-cube", FactType.Shape, new ShapeData
            {
                Target = "ABCD.A'B'C'D'",
                Shape = ShapeType.Regular_cube
            });

            var result = new ShapeValidator().Validate(fact, context, 5.0);
            AssertTrue(result.IsValid, "Regular cube should validate with available vertices");
        });

        RunCase("LengthValidator", () =>
        {
            var context = CreateContext(
                ("A", new Point3D(0, 0, 0)),
                ("B", new Point3D(10, 0, 0))
            );

            var fact = CreateFact("len", FactType.Length, new LengthData
            {
                Target = "AB",
                Value = "2a"
            });

            var result = new LengthValidator().Validate(fact, context, 5.0);
            AssertTrue(result.IsValid, "Length should pass");
        });

        RunCase("ShapeValidator - isosceles right triangle", () =>
        {
            var context = CreateContext(
                ("A", new Point3D(0, 0, 0)),
                ("B", new Point3D(1, 0, 0)),
                ("C", new Point3D(0, 1, 0))
            );

            var fact = CreateFact("shape-irt", FactType.Shape, new ShapeData
            {
                Target = "ABC",
                Shape = ShapeType.Isosceles_right_triangle
            });

            var result = new ShapeValidator().Validate(fact, context, 5.0);
            AssertTrue(result.IsValid, "Isosceles right triangle should validate");
        });

        RunCase("MidpointHandler + validator", () =>
        {
            var context = CreateContext(
                ("A", new Point3D(0, 0, 0)),
                ("B", new Point3D(2, 0, 0))
            );

            var fact = CreateFact("mid", FactType.Midpoint, new MidpointData
            {
                Point = "M",
                Segment = "AB"
            });

            new MidpointHandler().Handle(fact, context);

            AssertTrue(context.Points.ContainsKey("M"), "Midpoint should be created");
            AssertNear(context.Points["M"].X, 1, 1e-6, "Midpoint X");
            AssertNear(context.Points["M"].Y, 0, 1e-6, "Midpoint Y");
            AssertNear(context.Points["M"].Z, 0, 1e-6, "Midpoint Z");

            var result = new MidpointValidator().Validate(fact, context, 5.0);
            AssertTrue(result.IsValid, "Midpoint should validate");
        });

        RunCase("RatioHandler + validator", () =>
        {
            var context = CreateContext(
                ("A", new Point3D(0, 0, 0)),
                ("B", new Point3D(10, 0, 0))
            );

            var fact = CreateFact("ratio", FactType.Ratio, new RatioData
            {
                Segment1 = "AM",
                Segment2 = "AB",
                Value = "0.5"
            });

            new RatioHandler().Handle(fact, context);

            AssertTrue(context.Points.ContainsKey("M"), "Ratio point should be created");
            AssertNear(context.Points["M"].X, 5, 1e-6, "Ratio X");

            var result = new RatioValidator().Validate(fact, context, 5.0);
            AssertTrue(result.IsValid, "Ratio should validate");
        });

        RunCase("ProjectionHandler + validator", () =>
        {
            var context = CreateContext(
                ("A", new Point3D(0, 0, 0)),
                ("B", new Point3D(4, 0, 0)),
                ("C", new Point3D(0, 4, 0)),
                ("E", new Point3D(1, 1, 3))
            );

            var fact = CreateFact("proj", FactType.Projection, new ProjectionData
            {
                Point = "P",
                From = "E",
                Onto = "ABC"
            });

            new ProjectionHandler().Handle(fact, context);

            AssertTrue(context.Points.ContainsKey("P"), "Projection point should be created");
            AssertNear(context.Points["P"].X, 1, 1e-6, "Projection X");
            AssertNear(context.Points["P"].Y, 1, 1e-6, "Projection Y");
            AssertNear(context.Points["P"].Z, 0, 1e-6, "Projection Z");

            var result = new ProjectionValidator().Validate(fact, context, 5.0);
            AssertTrue(result.IsValid, "Projection should validate");
        });

        RunCase("IntersectionHandler - plane/plane", () =>
        {
            var context = CreateContext(
                ("A", new Point3D(0, 0, 0)),
                ("B", new Point3D(4, 0, 0)),
                ("C", new Point3D(0, 4, 0)),
                ("D", new Point3D(0, 0, 3))
            );

            var fact = CreateFact("int", FactType.Intersection, new IntersectionData
            {
                Objects = new List<string> { "ABC", "ABD" },
                Result = new IntersectionResult
                {
                    Type = IntersectionResultType.line,
                    Value = "L"
                }
            });

            new IntersectionHandler().Handle(fact, context);

            AssertTrue(context.GeneratedSegments.Contains("A-B"), "Plane-plane intersection should register AB");
        });

        RunCase("DistanceValidator - plane/plane", () =>
        {
            var context = CreateContext(
                ("A", new Point3D(0, 0, 0)),
                ("B", new Point3D(4, 0, 0)),
                ("C", new Point3D(0, 4, 0)),
                ("D", new Point3D(0, 0, 5)),
                ("E", new Point3D(4, 0, 5)),
                ("F", new Point3D(0, 4, 5))
            );

            var fact = CreateFact("dist-plane", FactType.Distance, new DistanceData
            {
                From = "ABC",
                To = "DEF",
                Value = "5"
            });

            var result = new DistanceValidator().Validate(fact, context, 5.0);
            AssertTrue(result.IsValid, "Plane-plane distance should validate");
        });

        RunCase("ParallelValidator - line/line", () =>
        {
            var context = CreateContext(
                ("A", new Point3D(0, 0, 0)),
                ("B", new Point3D(4, 0, 0)),
                ("C", new Point3D(0, 2, 0)),
                ("D", new Point3D(4, 2, 0))
            );

            var fact = CreateFact("par", FactType.Parallel, new ObjectsData
            {
                Objects = new List<string> { "AB", "CD" }
            });

            var result = new ParallelValidator().Validate(fact, context, 5.0);
            AssertTrue(result.IsValid, "Parallel line-line should validate");
        });

        RunCase("ParallelValidator - line/plane", () =>
        {
            var context = CreateContext(
                ("A", new Point3D(0, 0, 0)),
                ("B", new Point3D(4, 0, 0)),
                ("C", new Point3D(0, 4, 0)),
                ("D", new Point3D(1, 1, 0))
            );

            var fact = CreateFact("par-lp", FactType.Parallel, new ObjectsData
            {
                Objects = new List<string> { "AB", "ACD" }
            });

            var result = new ParallelValidator().Validate(fact, context, 5.0);
            AssertTrue(result.IsValid, "Parallel line-plane should validate");
        });

        RunCase("ParallelValidator - plane/plane", () =>
        {
            var context = CreateContext(
                ("A", new Point3D(0, 0, 0)),
                ("B", new Point3D(4, 0, 0)),
                ("C", new Point3D(0, 4, 0)),
                ("D", new Point3D(0, 0, 1)),
                ("E", new Point3D(4, 0, 1)),
                ("F", new Point3D(0, 4, 1))
            );

            var fact = CreateFact("par-pp", FactType.Parallel, new ObjectsData
            {
                Objects = new List<string> { "ABC", "DEF" }
            });

            var result = new ParallelValidator().Validate(fact, context, 5.0);
            AssertTrue(result.IsValid, "Parallel plane-plane should validate");
        });

        RunCase("PerpendicularValidator - line/plane", () =>
        {
            var context = CreateContext(
                ("A", new Point3D(0, 0, 0)),
                ("B", new Point3D(0, 0, 4)),
                ("C", new Point3D(1, 0, 0)),
                ("D", new Point3D(0, 1, 0))
            );

            var fact = CreateFact("perp", FactType.Perpendicular, new ObjectsData
            {
                Objects = new List<string> { "AB", "ACD" }
            });

            var result = new PerpendicularValidator().Validate(fact, context, 5.0);
            AssertTrue(result.IsValid, "Perpendicular line-plane should validate");
        });

        RunCase("PerpendicularValidator - line/line", () =>
        {
            var context = CreateContext(
                ("A", new Point3D(0, 0, 0)),
                ("B", new Point3D(4, 0, 0)),
                ("C", new Point3D(0, 0, 0)),
                ("D", new Point3D(0, 4, 0))
            );

            var fact = CreateFact("perp-ll", FactType.Perpendicular, new ObjectsData
            {
                Objects = new List<string> { "AB", "CD" }
            });

            var result = new PerpendicularValidator().Validate(fact, context, 5.0);
            AssertTrue(result.IsValid, "Perpendicular line-line should validate");
        });

        RunCase("PerpendicularValidator - plane/plane", () =>
        {
            var context = CreateContext(
                ("A", new Point3D(0, 0, 0)),
                ("B", new Point3D(4, 0, 0)),
                ("C", new Point3D(0, 4, 0)),
                ("D", new Point3D(0, 0, 0)),
                ("E", new Point3D(0, 1, 0)),
                ("F", new Point3D(0, 0, 1))
            );

            var fact = CreateFact("perp-pp", FactType.Perpendicular, new ObjectsData
            {
                Objects = new List<string> { "ABC", "DEF" }
            });

            var result = new PerpendicularValidator().Validate(fact, context, 5.0);
            AssertTrue(result.IsValid, "Perpendicular plane-plane should validate");
        });

        RunCase("AngleValidator - line/line", () =>
        {
            var context = CreateContext(
                ("A", new Point3D(0, 0, 0)),
                ("B", new Point3D(4, 0, 0)),
                ("C", new Point3D(0, 0, 0)),
                ("D", new Point3D(0, 4, 0))
            );

            var fact = CreateFact("ang", FactType.Angle, new AngleData
            {
                AngleType = AngleType.line_line,
                Objects = new List<string> { "AB", "CD" },
                Value = "90"
            });

            var result = new AngleValidator().Validate(fact, context, 5.0);
            AssertTrue(result.IsValid, "Angle line-line should validate");
        });

        RunCase("AngleValidator - line/plane", () =>
        {
            var context = CreateContext(
                ("A", new Point3D(0, 0, 0)),
                ("B", new Point3D(0, 0, 4)),
                ("C", new Point3D(0, 0, 0)),
                ("D", new Point3D(1, 0, 0)),
                ("E", new Point3D(0, 1, 0))
            );

            var fact = CreateFact("ang-lp", FactType.Angle, new AngleData
            {
                AngleType = AngleType.line_plane,
                Objects = new List<string> { "AB", "CDE" },
                Value = "90"
            });

            var result = new AngleValidator().Validate(fact, context, 5.0);
            AssertTrue(result.IsValid, "Angle line-plane should validate");
        });

        RunCase("AngleValidator - plane/plane", () =>
        {
            var context = CreateContext(
                ("A", new Point3D(0, 0, 0)),
                ("B", new Point3D(4, 0, 0)),
                ("C", new Point3D(0, 4, 0)),
                ("D", new Point3D(0, 0, 0)),
                ("E", new Point3D(0, 1, 0)),
                ("F", new Point3D(0, 0, 1))
            );

            var fact = CreateFact("ang-pp", FactType.Angle, new AngleData
            {
                AngleType = AngleType.plane_plane,
                Objects = new List<string> { "ABC", "DEF" },
                Value = "90"
            });

            var result = new AngleValidator().Validate(fact, context, 5.0);
            AssertTrue(result.IsValid, "Angle plane-plane should validate");
        });

        RunCase("RayHandler", () =>
        {
            var context = CreateContext(
                ("A", new Point3D(0, 0, 0)),
                ("B", new Point3D(2, 0, 0))
            );

            var fact = CreateFact("ray", FactType.Ray, new RayData
            {
                Point = "R",
                Origin = "A",
                RayPoint = "B"
            });

            new RayHandler().Handle(fact, context);
            AssertTrue(context.Points.ContainsKey("R"), "Ray point should be created");
        });

        RunCase("OppositeRayHandler", () =>
        {
            var context = CreateContext(
                ("A", new Point3D(0, 0, 0)),
                ("B", new Point3D(2, 0, 0))
            );

            var fact = CreateFact("oray", FactType.Opposite_ray, new OppositeRayData
            {
                Point = "R",
                Origin = "A",
                RayPoint = "B"
            });

            new OppositeRayHandler().Handle(fact, context);
            AssertTrue(context.Points.ContainsKey("R"), "Opposite ray point should be created");
        });

        RunCase("PerpendicularRayHandler", () =>
        {
            var context = CreateContext(
                ("A", new Point3D(0, 0, 0)),
                ("B", new Point3D(2, 0, 0))
            );

            var fact = CreateFact("pray", FactType.Perpendicular_ray, new PerpendicularRayData
            {
                Point = "R",
                Origin = "A",
                PerpendicularTo = "AB"
            });

            new PerpendicularRayHandler().Handle(fact, context);
            AssertTrue(context.Points.ContainsKey("R"), "Perpendicular ray point should be created");
        });

        RunCase("AngleBisectorHandler", () =>
        {
            var context = CreateContext(
                ("V", new Point3D(0, 0, 0)),
                ("A", new Point3D(1, 0, 0)),
                ("B", new Point3D(0, 1, 0))
            );

            var fact = CreateFact("abis", FactType.Angle_bisector, new AngleBisectorData
            {
                Point = "M",
                Vertex = "V",
                Ray1 = "A",
                Ray2 = "B"
            });

            new AngleBisectorHandler().Handle(fact, context);
            AssertTrue(context.Points.ContainsKey("M"), "Angle bisector point should be created");
        });

        RunCase("Đề 4 - đoạn AB + trung điểm M", () =>
        {
            var problem = CreateProblem(
                ["A", "B", "M"],
                ["AB"],
                CreateFact("len", FactType.Length, new LengthData { Target = "AB", Value = "10" }),
                CreateFact("mid", FactType.Midpoint, new MidpointData { Point = "M", Segment = "AB" })
            );
            var context = CompileProblem(problem);
            var integrity = PointIntegrityHelper.Evaluate(problem.Entities.Points, context.Points);
            AssertTrue(integrity.IsValid, "Points should match entities");
            AssertTrue(context.GeneratedSegments.Count > 0, "Segment AB should be generated");
        });

        RunCase("Đề 5 - điểm P chia AB tỉ lệ 1/2", () =>
        {
            var problem = CreateProblem(
                ["A", "B", "P"],
                ["AB"],
                CreateFact("ratio", FactType.Ratio, new RatioData { Segment1 = "AP", Segment2 = "PB", Value = "1/2" })
            );
            var context = CompileProblem(problem);
            var integrity = PointIntegrityHelper.Evaluate(problem.Entities.Points, context.Points);
            AssertTrue(integrity.IsValid, "Points should match entities");
            AssertTrue(context.Points.ContainsKey("P"), "P should be built");

            var a = context.Points["A"];
            var b = context.Points["B"];
            var p = context.Points["P"];
            var cross = (b.X - a.X) * (p.Y - a.Y) - (b.Y - a.Y) * (p.X - a.X);
            AssertTrue(Math.Abs(cross) < 1e-3, "P must be collinear with A and B");

            var filtered = PointIntegrityHelper.FilterSegments(
                problem.Entities,
                problem.Entities.Segments.Concat(context.GeneratedSegments));
            AssertTrue(filtered.All(s =>
                !s.Contains('P', StringComparison.OrdinalIgnoreCase) ||
                (s.Contains('A', StringComparison.OrdinalIgnoreCase) && s.Contains('B', StringComparison.OrdinalIgnoreCase))),
                "Declared segments should not include lateral edges through P (only AB)");
        });

        RunCase("Đề 6 - chóp thường, H chiếu trọng tâm đáy", () =>
        {
            var problem = CreateProblem(
                ["S", "A", "B", "C", "D", "H"],
                [],
                CreateFact("s1", FactType.Shape, new ShapeData { Target = "S.ABCD", Shape = ShapeType.Pyramid }),
                CreateFact("s2", FactType.Shape, new ShapeData { Target = "ABCD", Shape = ShapeType.Square }),
                CreateFact("p1", FactType.Projection, new ProjectionData { Point = "H", From = "S", Onto = "ABCD" })
            );
            var context = CompileProblem(problem);
            AssertTrue(context.Points.ContainsKey("S") && context.Points.ContainsKey("H"), "S and H required");
            var plane = context.GetPlane("ABCD");
            AssertTrue(plane != null, "Base plane required");
            var expectedH = plane!.GetProjection(context.Points["S"]);
            AssertNear(context.Points["H"].X, expectedH.X, 0.05, "H X should match projection of S");
            AssertNear(context.Points["H"].Y, expectedH.Y, 0.05, "H Y should match projection of S");
            AssertTrue(Math.Abs(context.Points["S"].X - context.Points["A"].X) > 0.5 || Math.Abs(context.Points["S"].Y - context.Points["A"].Y) > 0.5,
                "S should not be directly above vertex A (no right pyramid at A)");
        });

        RunCase("Đề 7 - giao điểm I của AB và CD", () =>
        {
            var problem = CreateProblem(
                ["A", "B", "C", "D", "I"],
                ["AB", "CD"],
                CreateFact("inter", FactType.Intersection, new IntersectionData
                {
                    Objects = ["AB", "CD"],
                    Result = new IntersectionResult { Type = IntersectionResultType.point, Value = "I" }
                })
            );
            var context = CompileProblem(problem);
            var integrity = PointIntegrityHelper.Evaluate(problem.Entities.Points, context.Points);
            AssertTrue(integrity.IsValid, "Points should match entities");
            AssertTrue(context.Points.ContainsKey("I"), "Intersection point I should exist");
        });

        RunCase("Đề 8 - hai mặt phẳng ABC và ABD", () =>
        {
            var problem = CreateProblem(
                ["A", "B", "C", "D"],
                [],
                planes: ["ABC", "ABD"],
                CreateFact("inter", FactType.Intersection, new IntersectionData
                {
                    Objects = ["ABC", "ABD"],
                    Result = new IntersectionResult { Type = IntersectionResultType.line, Value = "AB" }
                })
            );
            var context = CompileProblem(problem);
            var integrity = PointIntegrityHelper.Evaluate(problem.Entities.Points, context.Points);
            AssertTrue(integrity.IsValid, "Points should match entities");
            AssertTrue(context.Points.Count >= 4, "Four base points should exist");

            var filtered = PointIntegrityHelper.FilterSegments(
                problem.Entities,
                problem.Entities.Segments.Concat(context.GeneratedSegments));
            AssertTrue(!filtered.Any(s =>
                s.Contains("C", StringComparison.OrdinalIgnoreCase) &&
                s.Contains("D", StringComparison.OrdinalIgnoreCase)),
                "CD should not appear when only planes ABC and ABD are requested");
        });

        RunCase("Hộp chữ nhật - giữ đủ cạnh khung từ entities.solids", () =>
        {
            var problem = CreateProblem(
                ["A", "B", "C", "D", "A'", "B'", "C'", "D'"],
                ["AB", "AD", "AA'"],
                CreateFact("s1", FactType.Shape, new ShapeData
                {
                    Target = "ABCD.A'B'C'D'",
                    Shape = ShapeType.Regular_rectangular_cuboid
                }),
                CreateFact("l1", FactType.Length, new LengthData { Target = "AB", Value = "2 * a" }),
                CreateFact("l2", FactType.Length, new LengthData { Target = "AD", Value = "a" }),
                CreateFact("l3", FactType.Length, new LengthData { Target = "AA'", Value = "3 * a" })
            );
            problem.Entities.Solids = ["ABCD.A'B'C'D'"];
            var context = CompileProblem(problem);

            var filtered = PointIntegrityHelper.FilterSegments(
                problem.Entities,
                problem.Entities.Segments.Concat(context.GeneratedSegments));

            foreach (var expected in new[] { "A-B", "B-C", "C-D", "D-A", "A'-B'", "B'-C'", "C'-D'", "D'-A'", "A-A'", "B-B'", "C-C'", "D-D'" })
            {
                AssertTrue(filtered.Contains(expected, StringComparer.OrdinalIgnoreCase),
                    $"Expected wireframe edge {expected} in filtered segments");
            }
        });

        RunCase("Hai chóp đồng dạng - dựng đủ điểm S'.A'B'C'D'", () =>
        {
            var problem = CreateProblem(
                ["S", "A", "B", "C", "D", "S'", "A'", "B'", "C'", "D'"],
                [],
                CreateFact("s1", FactType.Shape, new ShapeData { Target = "S.ABCD", Shape = ShapeType.Pyramid }),
                CreateFact("s2", FactType.Shape, new ShapeData { Target = "S'.A'B'C'D'", Shape = ShapeType.Pyramid }),
                CreateFact("l1", FactType.Length, new LengthData { Target = "AB", Value = "a" }),
                CreateFact("l2", FactType.Length, new LengthData { Target = "A'B'", Value = "2 * a" })
            );
            problem.Entities.Solids = ["S.ABCD", "S'.A'B'C'D'"];
            var context = CompileProblem(problem);
            var integrity = PointIntegrityHelper.Evaluate(problem.Entities.Points, context.Points);
            AssertTrue(integrity.IsValid, $"All declared points should be built (missing: {string.Join(",", integrity.MissingPoints)})");
            AssertTrue(context.Points.ContainsKey("S'"), "Second apex S' should exist");
            AssertTrue(context.Points.ContainsKey("A'"), "Second base vertex A' should exist");
        });

        if (failures.Count > 0)
        {
            throw new InvalidOperationException(
                "Batch 1 smoke tests failed:\n" + string.Join("\n", failures.Select(f => "- " + f)));
        }

        Console.WriteLine("All batch 1 smoke tests passed.");

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

    private static void AssertNear(double actual, double expected, double tolerance, string label)
    {
        if (Math.Abs(actual - expected) > tolerance)
            throw new InvalidOperationException($"{label}: expected {expected}, got {actual}");
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

    private static FactDto CreateFact<T>(string id, FactType type, T data)
    {
        return new FactDto
        {
            Id = id,
            Type = type,
            Data = JsonSerializer.SerializeToElement(data)
        };
    }

    private static GeometryProblemDto CreateProblem(
        List<string> points,
        List<string> segments,
        params FactDto[] facts)
    {
        return CreateProblem(points, segments, [], facts);
    }

    private static GeometryProblemDto CreateProblem(
        List<string> points,
        List<string> segments,
        List<string> planes,
        params FactDto[] facts)
    {
        return new GeometryProblemDto
        {
            Entities = new EntitiesDto
            {
                Points = points,
                Segments = segments,
                Planes = planes
            },
            Facts = facts.ToList()
        };
    }

    private static CompilationContext CompileProblem(GeometryProblemDto problem)
    {
        return CreateCompiler().Compile(problem);
    }

    private static GeometryCompiler CreateCompiler()
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

        return new GeometryCompiler(
            handlers,
            new FactValidationEngine(validators),
            new QueryProcessingEngine(queryHandlers, queryValidators));
    }
}
