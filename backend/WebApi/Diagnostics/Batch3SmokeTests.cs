using System.Text.Json;
using Application.Compilers;
using Application.Compilers.FactHandlers;
using Application.Compilers.FactValidators;
using Application.DTOs;
using Application.DTOs.Enums;
using Application.DTOs.Facts;
using Domains.MathCore;

namespace WebApi.Diagnostics;

public static class Batch3SmokeTests
{
    public static void Run()
    {
        var failures = new List<string>();

        RunCase("IncenterHandler + validator", () =>
        {
            var context = CreateContext(
                ("A", new Point3D(0, 0, 0)),
                ("B", new Point3D(6, 0, 0)),
                ("C", new Point3D(0, 6, 0))
            );

            var fact = CreateFact("incenter-1", FactType.Incenter, new ShapeTargetData
            {
                Point = "I",
                Shape = "ABC"
            });

            new IncenterHandler().Handle(fact, context);

            AssertTrue(context.Points.ContainsKey("I"), "Incenter should be created");

            var result = new IncenterValidator().Validate(fact, context, 5.0);
            AssertTrue(result.IsValid, "Incenter should validate");
        });

        RunCase("OrthocenterHandler + validator", () =>
        {
            var context = CreateContext(
                ("A", new Point3D(0, 0, 0)),
                ("B", new Point3D(6, 0, 0)),
                ("C", new Point3D(0, 4, 0))
            );

            var fact = CreateFact("ortho-1", FactType.Orthocenter, new ShapeTargetData
            {
                Point = "H",
                Shape = "ABC"
            });

            new OrthocenterHandler().Handle(fact, context);

            AssertTrue(context.Points.ContainsKey("H"), "Orthocenter should be created");

            var result = new OrthocenterValidator().Validate(fact, context, 5.0);
            AssertTrue(result.IsValid, "Orthocenter should validate");
        });

        RunCase("CircumscribedHandler + validator", () =>
        {
            var context = CreateContext(
                ("S", new Point3D(0, 0, 3)),
                ("A", new Point3D(0, 0, 0)),
                ("B", new Point3D(4, 0, 0)),
                ("C", new Point3D(0, 4, 0))
            );

            var fact = CreateFact("circumscribed-1", FactType.Circumscribed, new CircumscribedData
            {
                Outer = "O",
                Inner = "SABC"
            });

            new CircumscribedHandler().Handle(fact, context);

            AssertTrue(context.Points.ContainsKey("O"), "Circumscribed center should be created");

            var result = new CircumscribedValidator().Validate(fact, context, 5.0);
            AssertTrue(result.IsValid, "Circumscribed should validate");
        });

        RunCase("InscribedHandler + validator", () =>
        {
            var context = CreateContext(
                ("S", new Point3D(0, 0, 3)),
                ("A", new Point3D(0, 0, 0)),
                ("B", new Point3D(4, 0, 0)),
                ("C", new Point3D(0, 4, 0))
            );

            var fact = CreateFact("inscribed-1", FactType.Inscribed, new InscribedData
            {
                Inner = "I",
                Outer = "SABC"
            });

            new InscribedHandler().Handle(fact, context);

            AssertTrue(context.Points.ContainsKey("I"), "Inscribed center should be created");

            var result = new InscribedValidator().Validate(fact, context, 5.0);
            AssertTrue(result.IsValid, "Inscribed should validate");
        });

        if (failures.Count > 0)
        {
            throw new InvalidOperationException("Batch3 smoke tests failed:\n" + string.Join("\n", failures));
        }

        Console.WriteLine("[BATCH3] All smoke tests passed.");

        void RunCase(string name, Action test)
        {
            try
            {
                test();
                Console.WriteLine($"[BATCH3] PASS: {name}");
            }
            catch (Exception ex)
            {
                failures.Add($"{name}: {ex.Message}");
                Console.WriteLine($"[BATCH3] FAIL: {name} -> {ex.Message}");
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
