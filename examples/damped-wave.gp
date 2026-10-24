# A function and a few observations
set title "A little signal, a little noise" font ",18"
set xlabel "Time (s)"
set ylabel "Amplitude"
set grid back lc rgb "#e2eaed"
set border 3 lc rgb "#718994"
set tics nomirror
set key top right
set xrange [0:10]
f(x) = sin(x) * exp(-x/8)
$observations << EOD
0.5 0.52
1.5 0.77
2.5 0.49
3.5 -0.18
4.5 -0.55
5.5 -0.39
6.5 0.16
7.5 0.42
8.5 0.31
9.5 -0.08
EOD
plot f(x) title "Damped wave" with lines lw 3 lc rgb "#087e8b", \
     $observations title "Observations" with points pt 7 ps 1.2 lc rgb "#e49c46"
