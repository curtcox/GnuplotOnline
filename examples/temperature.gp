set title "A week outside"
set xlabel "Day"
set ylabel "Temperature (°C)"
set grid ytics
set key top left
plot 'temperature.dat' using 1:2 with linespoints lw 3 pt 7 lc rgb "#087e8b" title "Afternoon", '' using 1:3 with linespoints lw 3 pt 5 lc rgb "#e49c46" title "Morning"
