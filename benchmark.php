<?php

// Simulate data
class Period {
    private $start;
    private $end;
    public function __construct($start, $end) {
        $this->start = $start;
        $this->end = $end;
    }
    public function getStart() { return $this->start; }
    public function getEnd() { return $this->end; }
}

$busy_periods = [];
for ($i = 0; $i < 1000; $i++) {
    $busy_periods[] = new Period("2023-10-01T10:00:00Z", "2023-10-01T11:00:00Z");
}

// Unoptimized
$start_time = microtime(true);
$ocupados = [];
foreach ($busy_periods as $period) {
    $start = new \DateTime($period->getStart());
    $start->setTimezone(new \DateTimeZone('America/Argentina/Buenos_Aires'));
    $end = new \DateTime($period->getEnd());
    $end->setTimezone(new \DateTimeZone('America/Argentina/Buenos_Aires'));

    $ocupados[] = array(
        'inicio' => $start->format('H:i'),
        'fin' => $end->format('H:i')
    );
}
$end_time = microtime(true);
$unoptimized_time = $end_time - $start_time;

// Optimized
$start_time = microtime(true);
$ocupados2 = [];
$tz = new \DateTimeZone('America/Argentina/Buenos_Aires');
foreach ($busy_periods as $period) {
    $start = new \DateTime($period->getStart());
    $start->setTimezone($tz);
    $end = new \DateTime($period->getEnd());
    $end->setTimezone($tz);

    $ocupados2[] = array(
        'inicio' => $start->format('H:i'),
        'fin' => $end->format('H:i')
    );
}
$end_time = microtime(true);
$optimized_time = $end_time - $start_time;

echo "Unoptimized Time: " . $unoptimized_time . " seconds\n";
echo "Optimized Time:   " . $optimized_time . " seconds\n";
echo "Improvement:      " . (($unoptimized_time - $optimized_time) / $unoptimized_time * 100) . "%\n";
