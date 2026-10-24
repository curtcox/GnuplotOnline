set title "Two rhythms"
set parametric
set trange [0:2*pi]
set samples 600
set size square
set grid
set xlabel "sin(3t)"
set ylabel "sin(4t)"
unset key
plot sin(3*t),sin(4*t) with lines lw 2 lc rgb "#087e8b"
