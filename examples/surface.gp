set title "Ripples in three dimensions"
set xlabel "x"
set ylabel "y"
set xrange [-6:6]
set yrange [-6:6]
set samples 45
set isosamples 45
set view 58,32
set pm3d
set palette defined (0 "#174c68", 0.5 "#5fb3b3", 1 "#f5cf7d")
unset key
f(x,y)=sin(sqrt(x*x+y*y))/(sqrt(x*x+y*y)+0.01)
splot f(x,y) with pm3d
