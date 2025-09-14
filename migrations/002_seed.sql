-- migrations/002_seed.sql
-- Seed 30 ACT-style questions (6th grade through early Geometry)

INSERT INTO questions (prompt, choice_a, choice_b, choice_c, choice_d, choice_e, correct_choice) VALUES
-- Middle school essentials
("What is 3/4 of 20?", "12", "15", "16", "18", "20", "B"),
("Simplify: 8 + (6 ÷ 2)", "5", "8", "11", "14", "17", "C"),
("Convert 0.75 to a fraction.", "1/2", "2/3", "3/4", "4/5", "5/6", "C"),
("A bag has 5 red, 3 blue, and 2 green marbles. What fraction are blue?", "1/5", "1/3", "2/5", "3/10", "3/5", "B"),
("What is 25% of 60?", "10", "12", "15", "18", "20", "C"),
("Simplify: 2(3 + 4) - 5", "5", "7", "9", "11", "13", "A"),
("What is the mean of 4, 6, 10, 0?", "4", "5", "6", "7", "8", "B"),
("The value of |-12| is:", "-12", "-1", "0", "1", "12", "E"),
("Which of these is a prime number?", "21", "27", "29", "33", "39", "C"),
("Simplify: 3^2 + 4^2", "12", "19", "25", "49", "81", "B"),

-- Pre-algebra / 8th grade
("Solve: 5x = 20", "2", "3", "4", "5", "6", "C"),
("Evaluate: 2^3 × 3", "6", "8", "12", "24", "48", "D"),
("Simplify: (x + 2) + (x + 5)", "2x + 7", "x + 10", "2x + 5", "x + 7", "2x + 12", "A"),
("Solve: x/4 = 7", "11", "14", "16", "21", "28", "E"),
("Which is equivalent to 4(x + 3)?", "4x + 3", "4x + 7", "4x + 12", "x + 12", "x + 7", "C"),
("Simplify: (2x)(3x)", "5x", "6", "6x", "6x^2", "x^6", "D"),
("Slope of the line through (0,0) and (3,6)?", "1/2", "2", "3", "6", "9", "B"),
("Graph y = 2x + 1. What is the y-intercept?", "-2", "-1", "0", "1", "2", "D"),
("Solve: 2x + 5 = 11", "2", "3", "4", "5", "6", "B"),
("Which set of numbers is a Pythagorean triple?", "(2,3,4)", "(3,4,5)", "(4,5,6)", "(5,6,7)", "(6,7,8)", "B"),

-- Algebra I
("Solve: x^2 = 49", "-7", "0", "7", "±7", "14", "D"),
("Factor: x^2 + 5x + 6", "(x+2)(x+3)", "(x+1)(x+6)", "(x-2)(x-3)", "(x+5)(x+1)", "(x+3)(x+5)", "A"),
("Simplify: (x^2)(x^3)", "x^5", "x^6", "x^9", "x^8", "x^10", "A"),
("Solve for y: 2y - 3 = 9", "3", "6", "9", "12", "15", "B"),
("Solve: |x - 4| = 6", "-2 and 10", "-6 and 2", "-10 and 2", "-2 only", "10 only", "A"),
("What is the slope of y = -3x + 7?", "3", "-3", "7", "-7", "0", "B"),
("If f(x) = 2x + 1, what is f(4)?", "5", "7", "8", "9", "11", "B"),
("Solve system: x + y = 5, x - y = 1", "(2,3)", "(3,2)", "(4,1)", "(1,4)", "(0,5)", "B"),
("What is the axis of symmetry for y = x^2 - 4x + 3?", "x = -2", "x = -1", "x = 0", "x = 1", "x = 2", "E"),
("Which is a solution to y = x^2 + x - 6?", "(-3,0)", "(-2,0)", "(1,0)", "(2,0)", "All of these", "E"),

-- Geometry
("What is the sum of the interior angles of a triangle?", "90", "120", "180", "270", "360", "C"),
("A right triangle has legs 6 and 8. Hypotenuse?", "7", "8", "9", "10", "14", "D"),
("Find the area of a rectangle with length 12 and width 5.", "17", "30", "60", "120", "144", "C"),
("What is the circumference of a circle with radius 7? (Use π≈3.14)", "21.98", "31.4", "43.96", "49", "77", "E"),
("An angle measures 35°. What is its supplement?", "55", "90", "120", "135", "145", "E"),
("The volume of a cube with side length 4 is:", "16", "32", "48", "64", "128", "D"),
("The perimeter of a square is 36. Side length?", "6", "8", "9", "12", "18", "C"),
("Which quadrilateral always has four right angles?", "Trapezoid", "Rhombus", "Square", "Parallelogram", "Kite", "C"),
("What is the area of a triangle with base 10 and height 6?", "16", "30", "36", "60", "100", "B"),
("A line perpendicular to y = 1/2x has slope:", "1/2", "-1/2", "2", "-2", "0", "D");
