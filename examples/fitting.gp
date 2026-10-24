set title "Finding the trend"
set xlabel "Input"
set ylabel "Response"
set grid
$D << EOD
1 23
2 40
3 64
4 79
5 101
6 125
EOD
f(x)=a*x+b
a=10
b=0.1
fit f(x) $D using 1:2 via a,b
print sprintf("Slope: %.3f; intercept: %.3f",a,b)
plot $D using 1:2 with points pt 7 ps 1.2 lc rgb "#e49c46" title "Measurements", f(x) lw 3 lc rgb "#087e8b" title "Best fit"
