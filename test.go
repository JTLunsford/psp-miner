package main

import "fmt"

func main(){
    switch {
        case true && false:
            fmt.Println("wont run")
        case true && true:
            fmt.Println("runs")
    }
}