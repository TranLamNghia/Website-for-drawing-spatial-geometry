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

public static class Batch6SmokeTests
{
    public static void Run()
    {
        var failures = new List<string>();
        var validator = new ShapeValidator();
        var handler = new ShapeHandler();
        var compiler = CreateCompiler();

        RunCase("ShapeValidator - regular_cube", () =>
        {
            var context = CreateContext(
                ("A", new Point3D(0, 0, 0)),
                ("B", new Point3D(5, 0, 0)),
                ("C", new Point3D(5, 5, 0)),
                ("D", new Point3D(0, 5, 0)),
                ("A'", new Point3D(0, 0, 5)),
                ("B'", new Point3D(5, 0, 5)),
                ("C'", new Point3D(5, 5, 5)),
                ("D'", new Point3D(0, 5, 5))
            );
            var fact = CreateFact("s-cube", FactType.Shape, new ShapeData
            {
                Target = "ABCD.A'B'C'D'",
                Shape = ShapeType.Regular_cube
            });
            AssertTrue(validator.Validate(fact, context, 5.0).IsValid, "Regular cube should validate");
        });

        RunCase("ShapeValidator - regular_rectangular_cuboid", () =>
        {
            var context = CreateContext(
                ("A", new Point3D(0, 0, 0)),
                ("B", new Point3D(6, 0, 0)),
                ("C", new Point3D(6, 4, 0)),
                ("D", new Point3D(0, 4, 0)),
                ("A'", new Point3D(0, 0, 3)),
                ("B'", new Point3D(6, 0, 3)),
                ("C'", new Point3D(6, 4, 3)),
                ("D'", new Point3D(0, 4, 3))
            );
            var fact = CreateFact("s-cuboid", FactType.Shape, new ShapeData
            {
                Target = "ABCD.A'B'C'D'",
                Shape = ShapeType.Regular_rectangular_cuboid
            });
            AssertTrue(validator.Validate(fact, context, 5.0).IsValid, "Regular rectangular cuboid should validate");
        });

        RunCase("ShapeValidator - regular_parallelepiped", () =>
        {
            var context = CreateContext(
                ("A", new Point3D(0, 0, 0)),
                ("B", new Point3D(5, 0, 0)),
                ("C", new Point3D(6, 3, 0)),
                ("D", new Point3D(1, 3, 0)),
                ("A'", new Point3D(0, 0, 4)),
                ("B'", new Point3D(5, 0, 4)),
                ("C'", new Point3D(6, 3, 4)),
                ("D'", new Point3D(1, 3, 4))
            );
            var fact = CreateFact("s-pp", FactType.Shape, new ShapeData
            {
                Target = "ABCD.A'B'C'D'",
                Shape = ShapeType.Regular_parallelepiped
            });
            AssertTrue(validator.Validate(fact, context, 5.0).IsValid, "Regular parallelepiped should validate");
        });

        RunCase("ShapeValidator - pentagon", () =>
        {
            var vertices = new[] { "A", "B", "C", "D", "E" };
            var context = new CompilationContext();
            ShapeBuildHelper.PlaceRegularPolygon(context.Points, vertices, 5.0);
            var fact = CreateFact("s-pent", FactType.Shape, new ShapeData
            {
                Target = "ABCDE",
                Shape = ShapeType.Pentagon
            });
            AssertTrue(validator.Validate(fact, context, 5.0).IsValid, "Pentagon should validate");
        });

        RunCase("ShapeValidator - hexagon", () =>
        {
            var vertices = new[] { "A", "B", "C", "D", "E", "F" };
            var context = new CompilationContext();
            ShapeBuildHelper.PlaceRegularPolygon(context.Points, vertices, 5.0);
            var fact = CreateFact("s-hex", FactType.Shape, new ShapeData
            {
                Target = "ABCDEF",
                Shape = ShapeType.Hexagon
            });
            AssertTrue(validator.Validate(fact, context, 5.0).IsValid, "Hexagon should validate");
        });

        RunCase("ShapeValidator - pentagonal_pyramid", () =>
        {
            var vertices = new[] { "A", "B", "C", "D", "E", "S" };
            var context = new CompilationContext();
            ShapeBuildHelper.PlaceRegularPolygon(context.Points, vertices.Take(5).ToArray(), 5.0);
            context.Points["S"] = new Point3D(0, 0, 6);
            var fact = CreateFact("s-pyr5", FactType.Shape, new ShapeData
            {
                Target = "S.ABCDE",
                Shape = ShapeType.Pentagonal_pyramid
            });
            AssertTrue(validator.Validate(fact, context, 5.0).IsValid, "Pentagonal pyramid should validate");
        });

        RunCase("ShapeValidator - hexagonal_pyramid", () =>
        {
            var context = new CompilationContext();
            ShapeBuildHelper.PlaceRegularPolygon(context.Points, new[] { "A", "B", "C", "D", "E", "F" }, 5.0);
            context.Points["S"] = new Point3D(0, 0, 6);
            var fact = CreateFact("s-pyr6", FactType.Shape, new ShapeData
            {
                Target = "S.ABCDEF",
                Shape = ShapeType.Hexagonal_pyramid
            });
            AssertTrue(validator.Validate(fact, context, 5.0).IsValid, "Hexagonal pyramid should validate");
        });

        RunCase("ShapeValidator - pentagonal_prism", () =>
        {
            var context = new CompilationContext();
            ShapeBuildHelper.PlaceRegularPolygon(context.Points, new[] { "A", "B", "C", "D", "E" }, 5.0);
            foreach (var v in new[] { "A", "B", "C", "D", "E" })
            {
                var p = context.Points[v];
                context.Points[v + "'"] = new Point3D(p.X, p.Y, 4);
            }
            var fact = CreateFact("s-prism5", FactType.Shape, new ShapeData
            {
                Target = "ABCDE.A'B'C'D'E'",
                Shape = ShapeType.Pentagonal_prism
            });
            AssertTrue(validator.Validate(fact, context, 5.0).IsValid, "Pentagonal prism should validate");
        });

        RunCase("ShapeValidator - hexagonal_prism", () =>
        {
            var context = new CompilationContext();
            ShapeBuildHelper.PlaceRegularPolygon(context.Points, new[] { "A", "B", "C", "D", "E", "F" }, 5.0);
            foreach (var v in new[] { "A", "B", "C", "D", "E", "F" })
            {
                var p = context.Points[v];
                context.Points[v + "'"] = new Point3D(p.X, p.Y, 4);
            }
            var fact = CreateFact("s-prism6", FactType.Shape, new ShapeData
            {
                Target = "ABCDEF.A'B'C'D'E'F'",
                Shape = ShapeType.Hexagonal_prism
            });
            AssertTrue(validator.Validate(fact, context, 5.0).IsValid, "Hexagonal prism should validate");
        });

        RunCase("ShapeHandler - regular_sphere", () =>
        {
            var context = new CompilationContext();
            var fact = CreateFact("s-sph", FactType.Shape, new ShapeData
            {
                Shape = ShapeType.Regular_sphere,
                Center = "O",
                Radius = "5"
            });
            handler.Handle(fact, context);
            AssertTrue(context.Spheres.Count == 1, "Regular sphere should add sphere data");
            AssertTrue(context.Points.ContainsKey("O"), "Sphere center should be created");
        });

        RunCase("Compiler - pentagonal_pyramid builds apex", () =>
        {
            var problem = CreateProblem(
                ["S", "A", "B", "C", "D", "E"],
                CreateFact("f1", FactType.Shape, new ShapeData { Target = "S.ABCDE", Shape = ShapeType.Pentagonal_pyramid })
            );
            var context = compiler.Compile(problem);
            AssertTrue(context.Points.Count >= 6, "Pentagonal pyramid should have base + apex");
            AssertTrue(context.Points.ContainsKey("S"), "Apex S should exist");
        });

        RunCase("Compiler - regular_cube builds 8 vertices", () =>
        {
            var problem = CreateProblem(
                ["A", "B", "C", "D", "A'", "B'", "C'", "D'"],
                CreateFact("f1", FactType.Shape, new ShapeData { Target = "ABCD.A'B'C'D'", Shape = ShapeType.Regular_cube })
            );
            var context = compiler.Compile(problem);
            AssertTrue(context.Points.Count >= 8, "Regular cube should build 8 vertices");
            AssertTrue(context.Points.ContainsKey("A'"), "Top base vertex A' should exist");
        });

        RunCase("Compiler - pentagon flat base", () =>
        {
            var problem = CreateProblem(
                ["A", "B", "C", "D", "E"],
                CreateFact("f1", FactType.Shape, new ShapeData { Target = "ABCDE", Shape = ShapeType.Pentagon })
            );
            var context = compiler.Compile(problem);
            AssertTrue(context.Points.Count >= 5, "Pentagon should build 5 vertices");
            var fact = problem.Facts[0];
            AssertTrue(validator.Validate(fact, context, 5.0).IsValid, "Compiled pentagon should validate");
        });

        if (failures.Count > 0)
        {
            throw new InvalidOperationException(
                "Batch 6 smoke tests failed:\n" + string.Join("\n", failures.Select(f => "- " + f)));
        }

        Console.WriteLine("All batch 6 smoke tests passed.");

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
            new CollinearValidator(), new TangentValidator()
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

    private static GeometryProblemDto CreateProblem(List<string> points, params FactDto[] facts)
    {
        return new GeometryProblemDto
        {
            Entities = new EntitiesDto { Points = points },
            Facts = facts.ToList()
        };
    }

    private static CompilationContext CreateContext(params (string Name, Point3D Point)[] points)
    {
        var context = new CompilationContext();
        foreach (var (name, point) in points)
            context.Points[name] = point;
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
        if (!condition) throw new InvalidOperationException(message);
    }

    private static void AssertNear(double actual, double expected, double tolerance, string label)
    {
        if (Math.Abs(actual - expected) > tolerance)
            throw new InvalidOperationException($"{label}: expected {expected}, got {actual}");
    }
}
