using Application.DTOs;
using Application.DTOs.Enums;
using Application.Compilers.FactValidators;
using Application.Compilers.QueryHandlers;
using Application.Compilers.QueryValidators;

namespace Application.Compilers;

public class QueryProcessingEngine
{
    private readonly IEnumerable<IQueryHandler> _handlers;
    private readonly IEnumerable<IQueryValidator> _validators;

    private static readonly HashSet<QueryType> Batch5QueryTypes =
    [
        QueryType.shape,
        QueryType.intersection_line,
        QueryType.equation_line,
        QueryType.equation_plane,
        QueryType.equation_sphere,
        QueryType.coordinates,
        QueryType.locus,
        QueryType.proof_parallel,
        QueryType.proof_perpendicular,
        QueryType.proof_equal,
        QueryType.cosine_between_planes,
        QueryType.sine_between_line_and_plane,
        QueryType.ratio_volume
    ];

    public QueryProcessingEngine(IEnumerable<IQueryHandler> handlers, IEnumerable<IQueryValidator> validators)
    {
        _handlers = handlers;
        _validators = validators;
    }

    public FullValidationReport Process(GeometryProblemDto problem, CompilationContext context)
    {
        var report = new FullValidationReport();

        foreach (var query in problem.Queries.Where(q => Batch5QueryTypes.Contains(q.Type)))
        {
            var handler = _handlers.FirstOrDefault(h => h.TargetQueryType == query.Type);
            handler?.Handle(query, problem, context);

            var validator = _validators.FirstOrDefault(v => v.TargetQueryType == query.Type);
            if (validator != null)
            {
                var result = validator.Validate(query, problem, context, context.UnitLength);
                report.Results.Add(result);
                Console.WriteLine($"[QUERY-VALIDATOR] {result.Message}");
            }
        }

        report.TotalChecked = report.Results.Count;
        report.TotalPassed = report.Results.Count(r => r.IsValid && !r.Message.StartsWith("⏭️"));
        report.TotalSkipped = report.Results.Count(r => r.Message.StartsWith("⏭️"));
        report.TotalFailed = report.Results.Count(r => !r.IsValid);
        report.AllPassed = report.TotalFailed == 0;

        Console.WriteLine($"[QUERY] ══════════════════════════════════════════");
        Console.WriteLine($"[QUERY] KẾT QUẢ QUERY: {(report.AllPassed ? "✅ TẤT CẢ PASS" : "❌ CÓ SAI SỐ")}");
        Console.WriteLine($"[QUERY]   Đã check: {report.TotalChecked} | Pass: {report.TotalPassed} | Fail: {report.TotalFailed} | Skip: {report.TotalSkipped}");
        Console.WriteLine($"[QUERY] ══════════════════════════════════════════");

        return report;
    }
}
