set title "Measurements with uncertainty"
set xlabel "Concentration"
set ylabel "Response"
set grid
$D << EOD
1 2.1 0.3
2 3.7 0.4
3 6.2 0.5
4 7.8 0.4
5 10.3 0.7
EOD
plot 2*x lw 2 lc rgb "#e49c46" title "Expected", $D using 1:2:3 with yerrorbars pt 7 ps 1.2 lw 2 lc rgb "#087e8b" title "Measured"
