set title "Under the curve"
set xlabel "Standard deviations"
set ylabel "Density"
set xrange [-4:4]
set yrange [0:0.45]
set samples 250
set style fill transparent solid 0.35 noborder
f(x)=exp(-x*x/2)/sqrt(2*pi)
plot f(x) with filledcurves y1=0 lc rgb "#087e8b" title "Normal distribution", f(x) with lines lw 3 lc rgb "#087e8b" notitle
