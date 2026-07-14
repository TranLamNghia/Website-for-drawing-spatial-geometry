using System.Linq;

namespace Application.Compilers.Helpers;

public static class TopologyHelper
{
    /// <summary>
    /// Finds the intersection line of two planes based on shared vertex letters.
    /// </summary>
    public static string? GetCommonLine(string plane1, string plane2)
    {
        plane1 = plane1.Replace("(", "").Replace(")", "");
        plane2 = plane2.Replace("(", "").Replace(")", "");

        // Find characters that appear in both planes
        var commonChars = plane1.Intersect(plane2).ToArray();

        // The intersection of two planes needs at least 2 shared vertices (2 letters)
        if (commonChars.Length >= 2)
        {
            return new string(commonChars.Take(2).ToArray());
        }

        return null;
    }
    
    /// <summary>
    /// Identifies the pyramid apex from the lateral face and base plane names.
    /// </summary>
    public static string? GetApex(string sidePlane, string basePlane)
    {
        sidePlane = sidePlane.Replace("(", "").Replace(")", "");
        basePlane = basePlane.Replace("(", "").Replace(")", "");

        // The letter in the lateral face but not in the base is the pyramid apex
        var apexChars = sidePlane.Except(basePlane).ToArray();
        
        if (apexChars.Length == 1)
            return apexChars[0].ToString();
            
        return null;
    }
}