set title "Tell the story"
set xrange [0:8]
set yrange [-0.2:1.4]
set xlabel "Time"
set ylabel "Response"
set grid
set label 1 "A turning point" at 3.8,1.18 textcolor rgb "#a96721"
set arrow 1 from 4.2,1.1 to 3.14,1 lc rgb "#a96721" lw 2
set label 2 "Settling down" at 5.0,0.2 textcolor rgb "#087e8b"
unset key
plot sin(x/2)*exp(-x/12) with lines lw 3 lc rgb "#087e8b"
