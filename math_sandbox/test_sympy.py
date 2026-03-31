import sympy as sp

A = sp.Point3D(-5, -3.5355, 0)
C = sp.Point3D(5, 3.5355, 0)
S_xy = sp.Point3D(1.6667, 1.1785, 0)
B = sp.Point3D(5, -3.5355, 0)

h = sp.Symbol('h', positive=True)
S = sp.Point3D(S_xy.x, S_xy.y, h)

L1 = sp.Line3D(A, C)
L2 = sp.Line3D(S, B)

# SymPy distance function with symbols can be very slow or fail to solve analytically
# Let's print the equation
eq = sp.Eq(L1.distance(L2), 5.0)
print("Equation:", eq)

try:
    sols = sp.nsolve(eq, h, 5.0) # try initial guess 5.0
    print("nsolve result:", sols)
except Exception as e:
    print("nsolve error:", e)

try:
    sols2 = sp.solve(eq, h)
    print("solve result:", sols2)
except Exception as e:
    print("solve error:", e)
