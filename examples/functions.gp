set title "Waves, together"
set xlabel "x"
set ylabel "Amplitude"
set grid
set xrange [-2*pi:2*pi]
plot sin(x) lw 3 lc rgb "#087e8b" title "sin(x)", cos(x) lw 3 lc rgb "#e49c46" title "cos(x)", sin(x)+cos(x) dt 2 lw 2 title "Their sum"
