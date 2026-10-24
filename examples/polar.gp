set title "A polar rose"
set polar
set angles radians
set size square
set samples 500
set grid polar
set xrange [-1.2:1.2]
set yrange [-1.2:1.2]
unset key
plot cos(3*t) with lines lw 3 lc rgb "#087e8b"
