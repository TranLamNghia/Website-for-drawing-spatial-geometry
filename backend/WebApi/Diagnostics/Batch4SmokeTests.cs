using System.Text.Json;
using Application.Compilers;
using Application.Compilers.FactHandlers;
using Application.Compilers.FactValidators;
using Application.DTOs;
using Application.DTOs.Enums;
using Application.DTOs.Facts;
using Domains.MathCore;

namespace WebApi.Diagnostics;

public static class Batch4SmokeTests
{
    public static void Run()
    {
        var failures = new List<string>();

        RunCase("AreaHandler + validator", () =>
        {
            var context = CreateContext(
                ("A", new Point3D(0, 0, 0)),
                ("B", new Point3D(4, 0, 0)),
                ("C", new Point3D(0, 3, 0))
            );

            var fact = CreateFact("area-1", FactType.Area, new LengthData
            {
                Target = "ABC",
                Value = "6"
            });

            new AreaHandler().Handle(fact, context);
            var result = new AreaValidator().Validate(fact, context, 5.0);
            AssertTrue(result.IsValid, "Area should validate");
        });

        RunCase("PerimeterHandler + validator", () =>
        {
            var context = CreateContext(
                ("A", new Point3D(0, 0, 0)),
                ("B", new Point3D(5, 0, 0)),
                ("C", new Point3D(5, 5, 0)),
                ("D", new Point3D(0, 5, 0))
            );

            var fact = CreateFact("perimeter-1", FactType.Perimeter, new PerimeterData
            {
                Target = "ABCD",
                Value = "4 * a"
            });

            new PerimeterHandler().Handle(fact, context);
            var result = new PerimeterValidator().Validate(fact, context, 5.0);
            AssertTrue(result.IsValid, "Perimeter should validate");
        });

        RunCase("VolumeHandler + validator", () =>
        {
            var context = CreateContext(
                ("S", new Point3D(0, 0, 3)),
                ("A", new Point3D(0, 0, 0)),
                ("B", new Point3D(4, 0, 0)),
                ("C", new Point3D(0, 4, 0))
            );

            var fact = CreateFact("volume-1", FactType.Volume, new VolumeData
            {
                Target = "SABC",
                Value = "8"
            });

            new VolumeHandler().Handle(fact, context);
            var result = new VolumeValidator().Validate(fact, context, 5.0);
            AssertTrue(result.IsValid, "Volume should validate");
        });

        RunCase("DistanceValidator point-point", () =>
        {
            var context = CreateContext(
                ("A", new Point3D(0, 0, 0)),
                ("B", new Point3D(3, 4, 0))
            );

            var fact = CreateFact("dist-pp", FactType.Distance, new DistanceData
            {
                From = "A",
                To = "B",
                Value = "a"
            });

            new DistanceHandler().Handle(fact, context);
            var result = new DistanceValidator().Validate(fact, context, 5.0);
            AssertTrue(result.IsValid, "Point-point distance should validate");
        });

        RunCase("DistanceValidator point-line", () =>
        {
            var context = CreateContext(
                ("A", new Point3D(0, 0, 0)),
                ("B", new Point3D(0, 5, 0)),
                ("C", new Point3D(1, 5, 0))
            );

            var fact = CreateFact("dist-pl", FactType.Distance, new DistanceData
            {
                From = "A",
                To = "BC",
                Value = "a"
            });

            var result = new DistanceValidator().Validate(fact, context, 5.0);
            AssertTrue(result.IsValid, "Point-line distance should validate");
        });

        RunCase("DistanceValidator line-line", () =>
        {
            var context = CreateContext(
                ("A", new Point3D(0, 0, 0)),
                ("B", new Point3D(1, 0, 0)),
                ("C", new Point3D(0, 2, 0)),
                ("D", new Point3D(1, 2, 0))
            );

            var fact = CreateFact("dist-ll", FactType.Distance, new DistanceData
            {
                From = "AB",
                To = "CD",
                Value = "2"
            });

            var result = new DistanceValidator().Validate(fact, context, 5.0);
            AssertTrue(result.IsValid, "Line-line distance should validate");
        });

        RunCase("DistanceValidator point-plane", () =>
        {
            var context = CreateContext(
                ("S", new Point3D(0, 0, 4)),
                ("A", new Point3D(0, 0, 0)),
                ("B", new Point3D(1, 0, 0)),
                ("C", new Point3D(0, 1, 0))
            );

            var fact = CreateFact("dist-ppl", FactType.Distance, new DistanceData
            {
                From = "S",
                To = "ABC",
                Value = "4"
            });

            var result = new DistanceValidator().Validate(fact, context, 5.0);
            AssertTrue(result.IsValid, "Point-plane distance should validate");
        });

        RunCase("DistanceValidator plane-plane", () =>
        {
            var context = CreateContext(
                ("A", new Point3D(0, 0, 0)),
                ("B", new Point3D(1, 0, 0)),
                ("C", new Point3D(0, 1, 0)),
                ("D", new Point3D(0, 0, 3)),
                ("E", new Point3D(1, 0, 3)),
                ("F", new Point3D(0, 1, 3))
            );

            var fact = CreateFact("dist-ppl2", FactType.Distance, new DistanceData
            {
                From = "ABC",
                To = "DEF",
                Value = "3"
            });

            var result = new DistanceValidator().Validate(fact, context, 5.0);
            AssertTrue(result.IsValid, "Plane-plane distance should validate");
        });

        RunCase("EqualityHandler + validator", () =>
        {
            var context = CreateContext(
                ("A", new Point3D(0, 0, 0)),
                ("B", new Point3D(4, 0, 0)),
                ("C", new Point3D(0, 3, 0)),
                ("D", new Point3D(4, 3, 0))
            );

            var fact = CreateFact("eq-1", FactType.Equality, new EqualityData
            {
                Objects = ["AB", "CD"]
            });

            new EqualityHandler().Handle(fact, context);
            var result = new EqualityValidator().Validate(fact, context, 5.0);
            AssertTrue(result.IsValid, "Equality should validate");
        });

        RunCase("CoplanarHandler + validator", () =>
        {
            var context = CreateContext(
                ("A", new Point3D(0, 0, 0)),
                ("B", new Point3D(1, 0, 0)),
                ("C", new Point3D(0, 1, 0)),
                ("D", new Point3D(1, 1, 0))
            );

            var fact = CreateFact("coplanar-1", FactType.Coplanar, new CoplanarData
            {
                Points = ["A", "B", "C", "D"]
            });

            new CoplanarHandler().Handle(fact, context);
            var result = new CoplanarValidator().Validate(fact, context, 5.0);
            AssertTrue(result.IsValid, "Coplanar should validate");
        });

        RunCase("CollinearHandler + validator", () =>
        {
            var context = CreateContext(
                ("M", new Point3D(0, 0, 0)),
                ("N", new Point3D(1, 1, 1)),
                ("P", new Point3D(2, 2, 2))
            );

            var fact = CreateFact("collinear-1", FactType.Collinear, new CollinearData
            {
                Points = ["M", "N", "P"]
            });

            new CollinearHandler().Handle(fact, context);
            var result = new CollinearValidator().Validate(fact, context, 5.0);
            AssertTrue(result.IsValid, "Collinear should validate");
        });

        RunCase("TangentHandler + validator (plane-sphere)", () =>
        {
            var context = CreateContext(
                ("O", new Point3D(0, 0, 0)),
                ("K", new Point3D(5, 0, 0)),
                ("B", new Point3D(5, 1, 0)),
                ("C", new Point3D(5, 0, 1))
            );
            context.Spheres.Add(new SphereData { Center = "O", Radius = 5 });

            var fact = CreateFact("tangent-1", FactType.Tangent, new TangentData
            {
                Objects = ["KBC", "O"],
                Point = "K"
            });

            new TangentHandler().Handle(fact, context);
            var result = new TangentValidator().Validate(fact, context, 5.0);
            AssertTrue(result.IsValid, "Plane-sphere tangent should validate");
        });

        if (failures.Count > 0)
        {
            throw new InvalidOperationException("Batch4 smoke tests failed:\n" + string.Join("\n", failures));
        }

        Console.WriteLine("[BATCH4] All smoke tests passed.");

        void RunCase(string name, Action test)
        {
            try
            {
                test();
                Console.WriteLine($"[BATCH4] PASS: {name}");
            }
            catch (Exception ex)
            {
                failures.Add($"{name}: {ex.Message}");
                Console.WriteLine($"[BATCH4] FAIL: {name} -> {ex.Message}");
            }
        }
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

    private static void AssertTrue(bool condition, string message)
    {
        if (!condition)
        {
            throw new InvalidOperationException(message);
        }
    }
}
