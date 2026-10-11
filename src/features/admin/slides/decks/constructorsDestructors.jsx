import { C, Callout, Code, Cols, Flow, Output, PointerDiagram, Points, Reveal, SlideTable } from '../SlideKit.jsx';

// Lecture deck: constructors and destructors in C++. Every program below was compiled with g++ -std=c++17 and the
// outputs shown are the real outputs.

const md = (...paragraphs) => paragraphs.join('\n\n');

// ---- Code ----------------------------------------------------------------------------------------------------

const NO_CTOR = `
class Account {
public:
    string name;
    double balance;      // nobody sets this
};

int main() {
    Account a;
    cout << a.balance;   // indeterminate value: garbage
}`;

const FIRST_CTOR = `
class Account {
    string name;
    double balance;
public:
    Account(const string& n, double b) {   // constructor
        name = n;
        balance = b;
        cout << "Account for " << name
             << " opened with Rs " << balance << "\\n";
    }
};

int main() {
    Account a("Asha", 500.0);   // the constructor runs here
}`;

const DEFAULT_CTOR = `
class Counter {
    int count;
public:
    Counter() { count = 0; }       // default constructor
    int get() const { return count; }
};

Counter c;      // calls Counter()
Counter d{};    // also Counter()
Counter e();    // ⚠ declares a FUNCTION named e!`;

const NO_DEFAULT = `
class Account {
    string name;
public:
    Account(const string& n) { name = n; }
};

Account a("Ravi");   // ✅
Account b;           // ❌ error: no matching function
                     //    for call to 'Account::Account()'`;

const NO_DEFAULT_FIXES = `
// Fix 1: write a default constructor yourself
Account() { name = "unknown"; }

// Fix 2: give every parameter a default value
Account(const string& n = "unknown") { name = n; }

// Fix 3 (C++11): ask the compiler to generate it
Account() = default;`;

const OVERLOADED = `
class Time {
    int h, m;
public:
    Time()               { h = 0;  m = 0;  }
    Time(int hh)         { h = hh; m = 0;  }
    Time(int hh, int mm) { h = hh; m = mm; }
    void show() const {
        cout << h << ":" << (m < 10 ? "0" : "") << m << "\\n";
    }
};

int main() {
    Time t1;          // Time()
    Time t2(9);       // Time(int)
    Time t3(9, 30);   // Time(int, int)
    t1.show(); t2.show(); t3.show();
}`;

const DEFAULT_ARGS = `
class Book {
    string title;
    double price;
public:
    Book(const string& t = "Untitled", double p = 0.0) {
        title = t;
        price = p;
    }
    void show() const {
        cout << title << " - Rs " << price << "\\n";
    }
};

int main() {
    Book a;                      // Book("Untitled", 0.0)
    Book b("C++ Primer");        // Book("C++ Primer", 0.0)
    Book c("Clean Code", 499);   // Book("Clean Code", 499.0)
    a.show(); b.show(); c.show();
}`;

const INIT_LIST = `
class Student {
    const int roll;      // const member: must be initialised
    string& college;     // reference member: must be bound
    double cgpa;
public:
    Student(int r, string& c, double g)
        : roll(r), college(c), cgpa(g)   // initializer list
    { }                                  // empty body
};`;

const INIT_ORDER = `
class Range {
    int size;    // declared 1st -> initialised 1st
    int start;   // declared 2nd -> initialised 2nd
public:
    Range(int s) : start(s), size(start + 10) { }
    //            ⚠ size is set first, while start
    //              is still uninitialised
};`;

const COPY_CTOR = `
class Point {
    int x, y;
public:
    Point(int a, int b) : x(a), y(b) { }
    Point(const Point& other) : x(other.x), y(other.y) {
        cout << "copy constructor\\n";
    }
};

void draw(Point p) { }   // pass by value: p is a copy

int main() {
    Point a(1, 2);
    Point b = a;   // 1. initialise from another object
    Point c(a);    // 2. same thing, direct form
    draw(a);       // 3. pass by value
}`;

const SHALLOW = `
class Buffer {
    int* data;
    int size;
public:
    Buffer(int n) : data(new int[n]()), size(n) { }
    ~Buffer() { delete[] data; }
    // No copy constructor: the compiler copies
    // the POINTER, not the array it points to.
};

int main() {
    Buffer a(5);
    Buffer b = a;   // b.data == a.data
}                   // ❌ ~b and ~a both delete[] the same
                    //    array: double free -> crash`;

const DEEP = `
Buffer(const Buffer& other)                   // copy constructor
    : data(new int[other.size]), size(other.size) {
    for (int i = 0; i < size; i++)
        data[i] = other.data[i];              // copy the contents
}

Buffer& operator=(const Buffer& other) {      // copy assignment
    if (this != &other) {                     // a = a; must be safe
        int* fresh = new int[other.size];
        for (int i = 0; i < other.size; i++)
            fresh[i] = other.data[i];
        delete[] data;                        // free the old array
        data = fresh;
        size = other.size;
    }
    return *this;
}`;

const CONVERSION = `
class Account {
    string name;
public:
    Account(const string& n) { name = n; }  // converting constructor
};

Account a = string("Poor, Charles");  // ✅ string -> Account
Account b("Poor, Charles");           // ✅ direct initialisation
Account c = "Poor, Charles";          // ❌ const char* -> string -> Account
                                      //    needs TWO user-defined conversions`;

const EXPLICIT = `
class Meters {
public:
    explicit Meters(double v) : value(v) { }
    double value;
};

void walk(Meters m);

walk(Meters(5.0));   // ✅ you asked for it
walk(5.0);           // ❌ explicit: no silent double -> Meters`;

const DELEGATING = `
class Time {
    int h, m;
public:
    Time(int hh, int mm) : h(hh), m(mm) { }  // does the work
    Time(int hh) : Time(hh, 0) { }            // delegates
    Time()       : Time(0, 0)  { }            // delegates
};`;

const NO_RECALL = `
Time t(9, 30);
t.Time(10, 0);     // ❌ error: invalid use of 'Time::Time'
t = Time(10, 0);   // ✅ build a temporary, then assign it`;

const DTOR = `
class FileLog {
    string file;
public:
    FileLog(const string& f) : file(f) {
        cout << "open " << file << "\\n";
    }
    ~FileLog() {                          // destructor
        cout << "close " << file << "\\n";
    }
};

int main() {
    FileLog log("exam.txt");
    cout << "writing...\\n";
}   // log's destructor runs here, automatically`;

const TRACER = `
class Tracer {
    string name;
public:
    Tracer(const string& n) : name(n) { cout << "+ " << name << "\\n"; }
    ~Tracer()                         { cout << "- " << name << "\\n"; }
};`;

const WHEN = `
Tracer global("global");

void f() {
    static Tracer s("static");
    Tracer local("local");
}

int main() {
    cout << "main starts\\n";
    Tracer* p = new Tracer("heap");
    f();
    Tracer("temporary");
    {
        Tracer inner("inner");
    }
    delete p;
    cout << "main ends\\n";
}`;

const WHEN_OUTPUT = `
+ global
main starts
+ heap
+ static
+ local
- local
+ temporary
- temporary
+ inner
- inner
- heap
main ends
- static
- global`;

const LIFO = `
int main() {
    Tracer a("a");
    Tracer b("b");
    Tracer c("c");
}`;

const CAR = `
class Engine {
public:
    Engine()  { cout << "Engine built\\n"; }
    ~Engine() { cout << "Engine scrapped\\n"; }
};
class Wheels {
public:
    Wheels()  { cout << "Wheels built\\n"; }
    ~Wheels() { cout << "Wheels scrapped\\n"; }
};
class Car {
    Engine engine;   // declared 1st
    Wheels wheels;   // declared 2nd
public:
    Car()  { cout << "Car ready\\n"; }
    ~Car() { cout << "Car scrapped\\n"; }
};

int main() { Car car; }`;

const INHERIT = `
class Person {
public:
    Person()  { cout << "Person()\\n"; }
    ~Person() { cout << "~Person()\\n"; }
};

class Student : public Person {
public:
    Student()  { cout << "Student()\\n"; }
    ~Student() { cout << "~Student()\\n"; }
};

int main() { Student s; }`;

const VIRTUAL_BAD = `
class Shape {
public:
    ~Shape() { cout << "~Shape\\n"; }        // ⚠ not virtual
};

class Circle : public Shape {
    double* cache = new double[100];
public:
    ~Circle() { delete[] cache; cout << "~Circle\\n"; }
};

int main() {
    Shape* s = new Circle;
    delete s;     // which destructor runs?
}`;

const VIRTUAL_GOOD = `
class Shape {
public:
    virtual ~Shape() { cout << "~Shape\\n"; }   // ✅
};`;

const LEAK = `
class Marks {
    int* scores;
    int count;
public:
    Marks(int n) : scores(new int[n]()), count(n) { }
    ~Marks() { delete[] scores; }      // new[] pairs with delete[]
};

void report() {
    Marks m(60);                       // array allocated
    if (/* nothing to report */ true)
        return;                        // early return: still freed
}                                      // ~Marks() runs on every path

void leaky() {
    Marks* p = new Marks(60);
}   // ❌ no delete: ~Marks never runs, 2 allocations leak`;

const RAII = `
#include <fstream>
#include <memory>

void save(const string& text) {
    ofstream out("result.txt");      // constructor opens the file
    out << text;
}                                    // destructor flushes and closes it

void modern() {
    auto p = make_unique<Marks>(60); // unique_ptr owns the Marks
    cout << "using marks\\n";
}                                    // ~unique_ptr calls delete -> ~Marks`;

const CONST_OBJ = `
class Account {
    string name;
public:
    Account(const string& n) : name(n) { }
    const string& getName() const { return name; }  // read-only
    void rename(const string& n) { name = n; }
};

const Account acc("Asha");   // ✅ the constructor still runs
acc.getName();               // ✅ const method
acc.rename("Ravi");          // ❌ not a const method
const Account none;          // ❌ no default constructor, and a
                             //    const object must be initialised`;

const JAVA = `
class Account implements AutoCloseable {
    Account(String n) { ... }        // constructor
    public void close() { ... }      // explicit clean-up
}

try (Account a = new Account("Asha")) {
    ...
}   // close() runs here; memory is freed later by the GC`;

const PYTHON = `
class Account:
    def __init__(self, name):   # initialiser
        self.name = name

    def __del__(self):          # finaliser: runs "some time"
        print("bye", self.name)

# Guaranteed clean-up: a context manager
with open("exam.txt") as f:
    data = f.read()             # closed when the block ends`;

const QUIZ_ORDER = `
int main() {
    Tracer a("1");
    {
        Tracer b("2");
    }
    Tracer c("3");
}`;

const QUIZ_CTOR = `
class Pen {
public:
    void Pen() { }      // (1)
    Pen(int ink) { }    // (2)
    ~Pen(int x) { }     // (3)
};`;

// ---- Slides --------------------------------------------------------------------------------------------------

export const constructorsDestructorsDeck = {
  id: 'constructors-destructors',
  title: 'Constructors & Destructors',
  subtitle: 'How C++ objects are born, live and die',
  description:
    'A detailed OOP lecture on C++ constructors and destructors: default, parameterised, copy and converting constructors, initializer lists, destruction order, virtual destructors and RAII. Every example comes with its real output.',
  slides: [
    {
      id: 'title',
      layout: 'title',
      title: 'Constructors & Destructors',
      body: (
        <div className="space-y-[1.4em]">
          <p className="text-[1.25em] text-indigo-100">How C++ objects are born, live and die</p>
          <div className="flex flex-wrap gap-[0.5em] text-[0.85em]">
            {[
              'Object lifetime',
              'Default & parameterised constructors',
              'Initializer lists',
              'Copy constructor',
              'Destructors',
              'Destruction order',
              'Virtual destructors',
              'RAII',
            ].map((topic) => (
              <span key={topic} className="rounded-full bg-white/15 px-[0.8em] py-[0.25em] ring-1 ring-white/25">
                {topic}
              </span>
            ))}
          </div>
          <p className="text-[0.85em] text-indigo-200">Object-Oriented Programming in C++</p>
        </div>
      ),
      notes: md(
        "This deck explains the two special member functions that control an object's lifetime in C++. The **constructor** runs when an object comes into existence and gets it ready for use. The **destructor** runs when the object's lifetime ends and cleans up after it.",
        'Every example in this deck is a complete, compilable C++17 program (with `#include <iostream>`, `#include <string>` and `using namespace std;` omitted to save space). Each output shown is the real output of that program, so you can type the examples in and check them yourself.',
        '**How to use this page:** use ← / → (or swipe on a phone) to move between slides, **F** for full screen, **O** for an overview of all slides. The explanation panel under each slide is the detailed narrative to read or present.',
      ),
    },
    {
      id: 'lifetime',
      kicker: 'The big picture',
      title: 'The life of an object',
      body: (
        <div className="space-y-[1.2em]">
          <Flow
            steps={[
              { title: 'Memory reserved', text: 'stack, static area or heap (new)' },
              { title: 'Constructor runs', text: 'members get valid values', accent: true },
              { title: 'Object is used', text: 'methods called, data read & changed' },
              { title: 'Destructor runs', text: 'resources released', accent: true },
              { title: 'Memory released', text: 'end of scope, program end or delete' },
            ]}
          />
          <Cols>
            <Callout tone="tip" title="Constructor = guaranteed start">
              An object can never be used before its constructor has finished. There is no "half-made" object.
            </Callout>
            <Callout tone="tip" title="Destructor = guaranteed end">
              When an object&apos;s lifetime ends, C++ calls its destructor automatically. You do not call it.
            </Callout>
          </Cols>
        </div>
      ),
      notes: md(
        'Every object goes through the same five stages. First, **memory is reserved** for it: on the stack for local variables, in the static data area for globals and `static` variables, or on the heap when you use `new`.',
        'Then the **constructor** runs. Its only job is to turn raw memory into a *valid* object: give every data member a sensible value, and acquire any resources the object needs (heap memory, an open file, a network connection).',
        'The object is then **used** through its methods. Because the constructor already established a valid state, every method can rely on it. This is the core promise of encapsulation.',
        "When the object's lifetime ends, the **destructor** runs and releases whatever the object acquired. Finally, the memory itself is released.",
        'The key point: the compiler inserts the constructor and destructor calls for you, at exactly the right places. That is what makes C++ resource management reliable. The rest of this deck is about the rules for *which* constructor runs and *when* destructors run.',
      ),
    },
    {
      id: 'problem',
      kicker: 'Why constructors exist',
      title: 'Without a constructor: garbage in',
      body: (
        <Cols wide="left">
          <Code>{NO_CTOR}</Code>
          <div className="space-y-[0.9em]">
            <Points
              items={[
                <>
                  Built-in members (<C>int</C>, <C>double</C>, pointers) of a local object are <strong>not</strong> set
                  to zero.
                </>,
                <>They hold whatever bytes were already in that memory.</>,
                <>
                  Reading them is <strong>undefined behaviour</strong>. The program may print <C>6.95e-310</C>, <C>0</C>{' '}
                  or anything else.
                </>,
              ]}
            />
            <Callout tone="warn" title="Public data has no guard">
              Anyone can also write <C>a.balance = -1000;</C>. Nothing checks it.
            </Callout>
          </div>
        </Cols>
      ),
      notes: md(
        'Here `Account` has no constructor, so `Account a;` only reserves memory. The `string` member is fine because `std::string` has its own constructor (it starts empty), but `double balance` is a built-in type and is left **uninitialised**.',
        'Reading an uninitialised variable is *undefined behaviour*: the C++ standard places no requirement on what happens. In practice you usually see leftover bytes from earlier stack use, which is why this bug often "works" in testing and fails in a demo.',
        'The second problem is that the data is `public`, so any code can put the object into an invalid state (a negative balance, an empty name). Both problems are solved together: make the data `private`, and provide a **constructor** that is guaranteed to run and set valid values.',
      ),
    },
    {
      id: 'what-is-ctor',
      kicker: 'Constructors',
      title: 'What is a constructor?',
      body: (
        <Cols wide="right">
          <Points
            items={[
              <>
                Same name as the class: <C>Account(...)</C>
              </>,
              <>
                <strong>No return type</strong>, not even <C>void</C>
              </>,
              <>Called automatically when an object is created</>,
              <>Can take parameters and can be overloaded</>,
              <>
                Usually <C>public</C>, so other code can create objects
              </>,
              <>Runs exactly once per object</>,
            ]}
          />
          <div className="space-y-[0.8em]">
            <Code>{FIRST_CTOR}</Code>
            <Output>Account for Asha opened with Rs 500</Output>
          </div>
        </Cols>
      ),
      notes: md(
        'A constructor is a special member function that the compiler calls **automatically** whenever an object of the class is created. You recognise it by two things: it has **the same name as the class**, and it has **no return type at all**. Writing `void Account(...)` is a compile error (g++: *"return type specification for constructor invalid"*), because only a constructor may use the class\'s own name.',
        'In the example, `Account a("Asha", 500.0);` reserves memory for `a` and immediately calls `Account(const string&, double)` with those two arguments. By the time the next statement runs, `a.name` and `a.balance` hold valid values. It is impossible to forget to initialise the object, because the language never lets you skip the constructor.',
        "The parameter is `const string&` rather than `string`: the constructor reads the argument without copying it, and the `const` promises not to change the caller's string. This is the recommended way to pass class-type arguments.",
        'A constructor runs **exactly once** per object, at creation time. You cannot call it again later on an existing object (slide 14 covers this).',
      ),
    },
    {
      id: 'default-ctor',
      kicker: 'Constructors',
      title: 'The default constructor',
      body: (
        <Cols>
          <Code>{DEFAULT_CTOR}</Code>
          <div className="space-y-[0.8em]">
            <Points
              items={[
                <>
                  A <strong>default constructor</strong> can be called with <strong>no arguments</strong>.
                </>,
                <>
                  Used by <C>Counter c;</C>, <C>Counter d{'{}'};</C>, <C>new Counter</C> and arrays like{' '}
                  <C>Counter arr[10];</C>
                </>,
                <>
                  If a class declares <strong>no constructors at all</strong>, the compiler writes an implicit public
                  one for you.
                </>,
              ]}
            />
            <Callout tone="warn" title='The "most vexing parse"'>
              <C>Counter e();</C> declares a <em>function</em> returning <C>Counter</C>. Write <C>Counter e;</C> or{' '}
              <C>Counter e{'{}'};</C>.
            </Callout>
          </div>
        </Cols>
      ),
      notes: md(
        'A **default constructor** is any constructor that can be called without arguments: either it has no parameters, or every parameter has a default value. It is used whenever you create an object without passing anything: plain definitions, `new Counter`, and arrays (each element of `Counter arr[10];` is default-constructed).',
        'If your class declares **no constructor whatsoever**, the compiler generates an *implicit* default constructor. It is `public` and calls the default constructor of each class-type member (so `string` members become empty strings), but it **does not initialise built-in members** of a local object. That is exactly the garbage problem from the previous slide.',
        'Watch out for the *most vexing parse*: `Counter e();` looks like "create e using the default constructor", but C++ reads it as the declaration of a function named `e` that takes no arguments and returns a `Counter`. The compiler will only complain later, when you try to use `e` as an object. Use `Counter e;` or brace initialisation `Counter e{};`.',
      ),
    },
    {
      id: 'no-default',
      kicker: 'Constructors',
      title: 'When the compiler stops helping',
      body: (
        <Cols>
          <div className="space-y-[0.8em]">
            <Code>{NO_DEFAULT}</Code>
            <Callout tone="error" title="Rule">
              Declare <strong>any</strong> constructor and the compiler no longer generates the default one.
            </Callout>
          </div>
          <Code label="Three ways to fix it">{NO_DEFAULT_FIXES}</Code>
        </Cols>
      ),
      notes: md(
        'This rule catches many students. As soon as a class declares **any** constructor, even one that takes parameters, the compiler assumes you are taking control of initialisation and **stops generating the implicit default constructor**.',
        'So with only `Account(const string&)` declared, `Account a("Ravi");` compiles, but `Account b;` fails with *"no matching function for call to `Account::Account()`"*. The same happens for arrays (`Account list[3];`), for `new Account`, and for `const Account inv;`.',
        'Choose the fix that matches your design. **Write a default constructor** if an "empty" account makes sense. **Use a default argument** if one constructor can serve both cases. Or write `Account() = default;` (C++11) to ask the compiler for the default constructor it would have generated. If an account without a name should never exist, *don\'t* add one: the compile error is then protecting you.',
      ),
    },
    {
      id: 'overloading',
      kicker: 'Constructors',
      title: 'Overloaded constructors',
      body: (
        <Cols wide="left">
          <Code>{OVERLOADED}</Code>
          <div className="space-y-[0.8em]">
            <Output>{'0:00\n9:00\n9:30'}</Output>
            <Points
              items={[
                <>A class can have many constructors with different parameter lists.</>,
                <>The compiler picks one by the number and types of the arguments (overload resolution).</>,
                <>
                  No match (or two equally good matches) is a <strong>compile-time error</strong>.
                </>,
              ]}
            />
          </div>
        </Cols>
      ),
      notes: md(
        'Constructors follow the normal rules of **function overloading**. You can declare several, as long as their parameter lists differ in number or types. When an object is created, the compiler looks at the arguments and selects the best-matching constructor at compile time.',
        '`Time t1;` has no arguments, so `Time()` runs. `Time t2(9);` has one `int`, so `Time(int)` runs. `Time t3(9, 30);` matches `Time(int, int)`. The output confirms which constructor initialised each object.',
        'If no constructor matches, as in `Time t4("nine");`, or two match equally well, the program does not compile. That is a good thing: mistakes in how objects are created are caught before the program ever runs.',
        'Notice the duplicated work across the three constructors. Slides 8 and 14 show two ways to remove it: default arguments and delegating constructors.',
      ),
    },
    {
      id: 'default-arguments',
      kicker: 'Constructors',
      title: 'Default arguments: one constructor, many forms',
      body: (
        <Cols wide="left">
          <Code>{DEFAULT_ARGS}</Code>
          <div className="space-y-[0.8em]">
            <Output>{'Untitled - Rs 0\nC++ Primer - Rs 0\nClean Code - Rs 499'}</Output>
            <Callout tone="tip" title="It is also the default constructor">
              Every parameter has a default, so <C>Book a;</C> works.
            </Callout>
            <Callout tone="warn" title="Do not add Book() as well">
              <C>Book()</C> plus this constructor makes <C>Book a;</C> <strong>ambiguous</strong>.
            </Callout>
          </div>
        </Cols>
      ),
      notes: md(
        'Default arguments let a single constructor replace several overloads. Missing arguments are filled in **from the right**: `Book b("C++ Primer")` supplies the title and takes the default price, and `Book a;` uses both defaults.',
        "Because every parameter has a default, this constructor can be called with no arguments, so it **is** the class's default constructor. Arrays of `Book` and `new Book` therefore work too.",
        'Two rules to remember. First, defaults must be trailing: once a parameter has a default, every parameter after it must have one too. Second, do not also declare a separate `Book()`. Then `Book a;` matches two constructors equally well, and the compiler reports an *ambiguous call*.',
        'Put the default values in the **declaration** (usually in the header file), not again in a separate definition in the `.cpp` file. Repeating them is a compile error.',
      ),
    },
    {
      id: 'initializer-list',
      kicker: 'Constructors',
      title: 'Member initializer lists',
      body: (
        <Cols>
          <div className="space-y-[0.8em]">
            <Code>{INIT_LIST}</Code>
            <Points
              items={[
                <>
                  <C>: member(value), ...</C> initialises members <strong>before</strong> the body runs.
                </>,
                <>
                  Assignment in the body = default-construct first, <em>then</em> overwrite.
                </>,
              ]}
            />
          </div>
          <div className="space-y-[0.8em]">
            <Callout tone="ok" title="You must use the initializer list for">
              <C>const</C> members, reference members, members (and base classes) that have no default constructor.
            </Callout>
            <Code label="Pitfall: initialisation order">{INIT_ORDER}</Code>
          </div>
        </Cols>
      ),
      notes: md(
        'Everything in the constructor body is **assignment**: by the time the body starts, every member has already been created. The **member initializer list** (after the colon) is where members are actually **initialised**: each one is constructed directly with the value you give it.',
        'For an `int` the difference is invisible, but it matters in three cases where the list is *required*. A `const` member cannot be assigned, only initialised. A reference must be bound when it is created and can never be re-bound. A member whose class has no default constructor cannot be "created empty first". The same goes for passing arguments to a **base class** constructor (slide 19). For members such as `string` and `vector`, the list is also faster: it avoids building an empty object and then replacing it.',
        "**The order pitfall:** members are always initialised in the order they are **declared in the class**, not the order you write them in the list. In `Range`, `size` is declared first, so `size(start + 10)` runs while `start` is still garbage. g++ warns about this with `-Wall` (`-Wreorder`). Write the initializer list in declaration order and never let one member's initialiser depend on a member declared after it.",
      ),
    },
    {
      id: 'copy-ctor',
      kicker: 'Constructors',
      title: 'The copy constructor',
      body: (
        <Cols wide="left">
          <Code>{COPY_CTOR}</Code>
          <div className="space-y-[0.8em]">
            <Output>{'copy constructor\ncopy constructor\ncopy constructor'}</Output>
            <Points
              items={[
                <>
                  Signature: <C>ClassName(const ClassName&amp; other)</C>
                </>,
                <>
                  Runs when a new object is created from an existing one: initialisation, pass by value, return by
                  value.
                </>,
                <>
                  If you don&apos;t write one, the compiler generates a <strong>memberwise</strong> copy.
                </>,
              ]}
            />
            <Callout tone="warn" title="Why a reference?">
              Taking <C>Point other</C> by value would need a copy, which calls the copy constructor, which needs a
              copy, and so on forever.
            </Callout>
          </div>
        </Cols>
      ),
      notes: md(
        'The **copy constructor** creates a new object as a copy of an existing object of the same class. Its parameter is a reference to `const`: a reference because it must not need a copy itself, and `const` because copying must not change the original.',
        'It runs in three situations, all shown in the program. `Point b = a;` and `Point c(a);` initialise a new object from `a` (the `=` here is initialisation, **not** assignment, because `b` is being created). `draw(a)` passes `a` by value, so the parameter `p` is copy-constructed. Returning an object by value can also copy, although modern compilers usually optimise that copy away (*copy elision*).',
        'If you do not declare a copy constructor, the compiler generates one that copies each member in turn (a *memberwise* or *shallow* copy). That is perfect for `Point`, whose members are plain values. The next two slides show when it is a disaster.',
        'Compare this with **copy assignment** `b = a;` where `b` already exists. That calls `operator=`, not the copy constructor.',
      ),
    },
    {
      id: 'shallow-copy',
      kicker: 'Constructors',
      title: 'Shallow copy: two owners, one array',
      body: (
        <Cols wide="left">
          <Code>{SHALLOW}</Code>
          <div className="space-y-[0.8em]">
            <PointerDiagram shared />
            <Points
              items={[
                <>The generated copy constructor copies the pointer value, so both objects point at the same array.</>,
                <>
                  Changing <C>b</C>&apos;s data silently changes <C>a</C>&apos;s.
                </>,
                <>
                  At the end of <C>main</C>, both destructors <C>delete[]</C> the same memory:{' '}
                  <strong>double free</strong>.
                </>,
              ]}
            />
          </div>
        </Cols>
      ),
      notes: md(
        '`Buffer` **owns** a heap array: its constructor allocates it with `new int[n]` and its destructor frees it with `delete[]`. That is correct so far.',
        'The trouble starts with `Buffer b = a;`. There is no user-written copy constructor, so the compiler-generated one copies each member. It copies `size`, and it copies `data`, which is just an address. Now `a.data` and `b.data` hold **the same address**: two objects each believe they own one array.',
        'At the closing brace of `main`, `b` is destroyed first and frees the array. Then `a` is destroyed and frees **the same array again**. A double free is undefined behaviour; with glibc you typically see *"free(): double free detected"* and the program aborts. Even before that, writing through `b` changes what `a` sees.',
        "The general lesson: if a class manages a resource through a raw pointer, the compiler's memberwise copy is wrong for it.",
      ),
    },
    {
      id: 'deep-copy',
      kicker: 'Constructors',
      title: 'Deep copy & the Rule of Three',
      body: (
        <Cols wide="left">
          <Code>{DEEP}</Code>
          <div className="space-y-[0.8em]">
            <PointerDiagram shared={false} />
            <Callout tone="ok" title="Rule of Three">
              If a class needs a custom <strong>destructor</strong>, <strong>copy constructor</strong> or{' '}
              <strong>copy assignment</strong>, it almost certainly needs all three.
            </Callout>
            <Callout tone="tip" title="Rule of Zero (better)">
              Hold resources in <C>vector</C>, <C>string</C> or <C>unique_ptr</C>, and write none of the three.
            </Callout>
          </div>
        </Cols>
      ),
      notes: md(
        'A **deep copy** gives the new object its *own* array and copies the **contents** into it. After `Buffer b = a;`, the two objects are fully independent: changing one never affects the other, and each destructor frees only its own memory.',
        'The copy **assignment** operator needs the same treatment, plus two extra details. It must handle **self-assignment** (`a = a;`), hence the `this != &other` check. It must also **free the array it already owns**, otherwise that memory leaks. Allocating the new array *before* deleting the old one means that if `new` throws, the object is left unchanged.',
        'These three functions (destructor, copy constructor, copy assignment) are linked. A class that needs one of them almost always needs all three. This is the **Rule of Three** (in C++11 it extends to the **Rule of Five** with the move constructor and move assignment).',
        "In modern C++ the best option is the **Rule of Zero**: don't manage raw memory yourself. If `Buffer` stored a `std::vector<int>`, the compiler-generated copy, assignment and destructor would all be correct automatically.",
      ),
    },
    {
      id: 'conversion',
      kicker: 'Constructors',
      title: 'Converting constructors & explicit',
      body: (
        <Cols>
          <div className="space-y-[0.8em]">
            <Code>{CONVERSION}</Code>
            <Callout tone="warn" title="At most one user-defined conversion">
              The compiler applies at most <strong>one</strong> user-defined conversion implicitly.
            </Callout>
          </div>
          <div className="space-y-[0.8em]">
            <Code>{EXPLICIT}</Code>
            <Points
              items={[
                <>
                  A one-argument constructor also acts as an implicit conversion <C>T</C> ← argument.
                </>,
                <>
                  Mark it <C>explicit</C> when silent conversions would be surprising.
                </>,
              ]}
            />
          </div>
        </Cols>
      ),
      notes: md(
        'A constructor that can be called with **one argument** doubles as a **conversion**: it tells the compiler how to turn a `string` into an `Account`. That is why the *copy-initialisation* `Account a = string("Poor, Charles");` works. It calls `Account(const string&)` exactly like `Account a(string("Poor, Charles"));`.',
        '**Common trap:** `Account c = "Poor, Charles";` does **not** compile with a standard compiler. A string literal is a `const char[14]`, not a `std::string`. Getting to `Account` would need two user-defined conversions in a row (`const char*` to `string` via `string`\'s constructor, then `string` to `Account` via ours), and C++ applies at most one implicitly. g++ reports *"conversion from `const char [14]` to non-scalar type `Account` requested"*. Direct initialisation `Account b("Poor, Charles");` works, because there the literal is just a constructor argument.',
        'Implicit conversions can hide bugs: with a plain `Meters(double)` constructor, `walk(5.0)` would silently create a `Meters` from a bare number. Marking the constructor **`explicit`** forbids implicit use. Callers must then write `Meters(5.0)`, which makes the intent visible. A good default: make single-argument constructors `explicit` unless the conversion is natural.',
      ),
    },
    {
      id: 'delegating',
      kicker: 'Constructors',
      title: 'Delegating constructors & "call once" rule',
      body: (
        <Cols>
          <div className="space-y-[0.8em]">
            <Code label="C++11 delegating constructors">{DELEGATING}</Code>
            <Points
              items={[
                <>One constructor does the work; the others forward to it.</>,
                <>No duplicated initialisation code to keep in sync.</>,
              ]}
            />
          </div>
          <div className="space-y-[0.8em]">
            <Code label="A constructor runs exactly once">{NO_RECALL}</Code>
            <Callout tone="error" title="You cannot re-run a constructor">
              Constructors are not called on existing objects. To change one, use assignment or a setter.
            </Callout>
          </div>
        </Cols>
      ),
      notes: md(
        'Since C++11, a constructor can **delegate** to another constructor of the same class by naming it in the initializer list: `Time(int hh) : Time(hh, 0) { }`. The target constructor runs first, then the delegating constructor\'s own body (empty here). It is a clean alternative to default arguments when the "shortcut" constructors need different logic, and it removes the copy-pasted assignments from slide 7.',
        'The second example shows a rule that appears in exams: **a constructor cannot be called on an object that already exists**. `t.Time(10, 0);` is a compile error (*"invalid use of `Time::Time`"*). An object is constructed once, at the moment it is created, and never again.',
        "If you want `t` to hold a new value, build a new temporary object and **assign** it: `t = Time(10, 0);`. That runs the constructor for the temporary, then copy- (or move-) assignment into `t`, then the temporary's destructor. Or provide a setter method such as `t.set(10, 0)`.",
      ),
    },
    {
      id: 'what-is-dtor',
      kicker: 'Destructors',
      title: 'What is a destructor?',
      body: (
        <Cols wide="right">
          <Points
            items={[
              <>
                Name: tilde + class name, <C>~FileLog()</C>
              </>,
              <>
                <strong>No parameters</strong> and <strong>no return type</strong>
              </>,
              <>
                Exactly <strong>one</strong> per class, so it cannot be overloaded
              </>,
              <>Called automatically when the object&apos;s lifetime ends</>,
              <>If you don&apos;t write one, the compiler generates a public one</>,
              <>Must not throw exceptions</>,
            ]}
          />
          <div className="space-y-[0.8em]">
            <Code>{DTOR}</Code>
            <Output>{'open exam.txt\nwriting...\nclose exam.txt'}</Output>
          </div>
        </Cols>
      ),
      notes: md(
        "The **destructor** is the constructor's counterpart. It is named with a tilde `~` followed by the class name, takes **no parameters** and has **no return type**. The book-style declaration `~class_name(void);` means the same thing: `(void)` is just an explicitly empty parameter list.",
        'Because a destructor cannot take parameters, it **cannot be overloaded**: overloads need different parameter lists, and there is only one possible (empty) list. So every class has **exactly one** destructor. Writing `~FileLog(int x)` is a compile error (*"destructors may not have parameters"*). That makes sense: the destructor is called automatically, so there is nowhere for arguments to come from.',
        'If you do not declare one, the compiler generates a **public default destructor** that destroys each member. It does *not* `delete` raw pointers: memory you allocated with `new` is your responsibility.',
        'In the program, the destructor runs at the closing brace of `main`, after `writing...` is printed. You never write `log.~FileLog();` yourself (explicitly calling a destructor is almost always a bug). Destructors should also never throw: if one throws while another exception is already in flight, the program calls `std::terminate`.',
      ),
    },
    {
      id: 'when',
      kicker: 'Destructors',
      title: 'When exactly do destructors run?',
      body: (
        <div className="space-y-[0.9em]">
          <Cols wide="left">
            <Code label="Tracer prints “+ name” when constructed and “- name” when destroyed">{WHEN}</Code>
            <Output>{WHEN_OUTPUT}</Output>
          </Cols>
        </div>
      ),
      notes: md(
        "`Tracer` is a tiny class whose constructor prints `+ name` and whose destructor prints `- name` (its full definition is on the next slide), so the output is a precise record of every object's lifetime. Read the output line by line:",
        '- **Global** objects are constructed **before `main` starts** and destroyed **after `main` returns**. They have the longest lifetime.\n- **Dynamic** objects (`new`) live until *you* `delete` them. `heap` is destroyed exactly at `delete p;`, not at the end of a block. Forget the `delete` and its destructor never runs at all.\n- **Local** objects are destroyed at the **end of the block** that defines them: `local` dies when `f()` returns, `inner` at its closing brace.\n- A **`static` local** is constructed the first time control reaches its definition and lives until the end of the program, like a global.\n- A **temporary** (`Tracer("temporary");` has no name) is destroyed at the **end of the full expression**, i.e. at the semicolon.',
        'Objects with static storage duration (globals and static locals) are destroyed in the **reverse order of their construction** after `main` ends. That is why `static` (constructed second) is destroyed before `global` (constructed first).',
      ),
    },
    {
      id: 'lifo',
      kicker: 'Destructors',
      title: 'Destruction order: last in, first out',
      body: (
        <Cols>
          <div className="space-y-[0.8em]">
            <Code label="The Tracer class used on these slides">{TRACER}</Code>
            <Cols>
              <Code>{LIFO}</Code>
              <Output>{'+ a\n+ b\n+ c\n- c\n- b\n- a'}</Output>
            </Cols>
          </div>
          <div className="space-y-[0.8em]">
            <SlideTable
              head={['Step', 'Stack (top on the right)']}
              rows={[
                ['construct a', 'a'],
                ['construct b', 'a  b'],
                ['construct c', 'a  b  c'],
                ['} destroy c', 'a  b'],
                ['destroy b', 'a'],
                ['destroy a', '(empty)'],
              ]}
            />
            <Callout tone="tip" title="Why reverse order?">
              Later objects may depend on earlier ones, so earlier objects must outlive them.
            </Callout>
          </div>
        </Cols>
      ),
      notes: md(
        'Objects in the same scope are destroyed in the **reverse order of their construction**, like plates on a stack: the last one put on is the first one taken off (*LIFO*).',
        "This is not arbitrary. An object created later may have been initialised *using* an earlier one: it may hold a reference or pointer to it, or have registered itself with it. If `a` were destroyed first, `c`'s destructor could still try to use `a`, which would already be gone. Destroying in reverse order guarantees every object outlives everything that might depend on it.",
        'The same reverse-order rule applies everywhere in C++: data members of an object, elements of an array (the last element is destroyed first), base and derived parts, and global objects at program exit.',
      ),
    },
    {
      id: 'composition',
      kicker: 'Destructors',
      title: 'Objects inside objects',
      body: (
        <Cols wide="left">
          <Code>{CAR}</Code>
          <div className="space-y-[0.8em]">
            <Output>{'Engine built\nWheels built\nCar ready\nCar scrapped\nWheels scrapped\nEngine scrapped'}</Output>
            <SlideTable
              head={['Construction', 'Destruction']}
              rows={[
                ['1. members, in declaration order', "1. owner's destructor body"],
                ["2. owner's constructor body", '2. members, in reverse order'],
              ]}
            />
          </div>
        </Cols>
      ),
      notes: md(
        "When a class contains other objects as data members (*composition*: a car **has an** engine), construction happens **inside out**. All members are fully constructed first, in the order they are **declared** in the class. Only then does the owner's constructor body run. So when `Car()` prints *Car ready*, it can safely use `engine` and `wheels`.",
        "Destruction is the exact mirror, **outside in**. The owner's destructor body runs **first**, while all members are still alive (so `~Car()` may still use `engine`). Then the members are destroyed automatically, in **reverse declaration order**: `wheels` before `engine`.",
        'You never call member destructors yourself; the compiler does it after your destructor body finishes. A common exam distractor says "the containing object\'s destructor runs after its members\' destructors". That is false: its *body* runs first.',
      ),
    },
    {
      id: 'inheritance',
      kicker: 'Destructors',
      title: 'Inheritance: base first in, last out',
      body: (
        <Cols wide="left">
          <Code>{INHERIT}</Code>
          <div className="space-y-[0.8em]">
            <Output>{'Person()\nStudent()\n~Student()\n~Person()'}</Output>
            <Points
              items={[
                <>The base part is built first, then the derived part.</>,
                <>Destruction runs in reverse: derived first, base last.</>,
                <>
                  Pass arguments to the base in the initializer list:{' '}
                  <C>Student(const string&amp; n) : Person(n) {'{ }'}</C>
                </>,
              ]}
            />
          </div>
        </Cols>
      ),
      notes: md(
        "A `Student` object contains a complete `Person` sub-object. The **base class part is constructed first**, because the derived constructor may want to use inherited members and they must already be valid. Then the derived class's members and constructor body follow.",
        'Destruction mirrors construction: `~Student()` runs first (it may still use the `Person` part), and then `~Person()` runs automatically. The full order for any object is: **base classes → members → constructor body** on the way in, and **destructor body → members → base classes** on the way out.',
        'If the base class has no default constructor, the derived constructor **must** call a base constructor explicitly in its initializer list, e.g. `Student(const string& n) : Person(n) { }`. The initializer list is the only place this can be done.',
      ),
    },
    {
      id: 'virtual-dtor',
      kicker: 'Destructors',
      title: 'Virtual destructors',
      body: (
        <Cols wide="left">
          <Code>{VIRTUAL_BAD}</Code>
          <div className="space-y-[0.8em]">
            <Output label="Output (not virtual)">~Shape</Output>
            <Callout tone="error" title="Circle's destructor never ran">
              Its array leaks. Strictly, the behaviour is undefined.
            </Callout>
            <Code label="Fix">{VIRTUAL_GOOD}</Code>
            <Output label="Output (virtual)">{'~Circle\n~Shape'}</Output>
          </div>
        </Cols>
      ),
      notes: md(
        'With polymorphism you often hold a derived object through a **base-class pointer**: `Shape* s = new Circle;`. When you later `delete s;`, the compiler must decide which destructor to call. If `~Shape()` is **not virtual**, that decision uses the *static* type of the pointer (`Shape`), so only `~Shape()` runs. `~Circle()` is skipped and the `cache` array leaks. The standard says this is **undefined behaviour**.',
        'Declaring the base destructor **`virtual`** makes the call dispatch on the *dynamic* type: `~Circle()` runs first, then `~Shape()` automatically, exactly as on the inheritance slide.',
        'Rule of thumb: **if a class has any virtual function, or is meant to be deleted through a base pointer, give it a public virtual destructor.** It costs almost nothing. Constructors, on the other hand, can **never** be virtual: when an object is being created, its exact type is already known.',
      ),
    },
    {
      id: 'dynamic-memory',
      kicker: 'Destructors',
      title: 'Destructors and dynamic memory',
      body: (
        <Cols wide="left">
          <Code>{LEAK}</Code>
          <div className="space-y-[0.8em]">
            <SlideTable
              head={['Allocate with', 'Release with']}
              rows={[
                [<C key="a">new T</C>, <C key="b">delete p</C>],
                [<C key="c">new T[n]</C>, <C key="d">delete[] p</C>],
              ]}
            />
            <Callout tone="error" title="Mismatches are undefined behaviour">
              <C>delete</C> on an array, or <C>delete[]</C> on a single object.
            </Callout>
            <Callout tone="tip" title="Local object = automatic clean-up">
              <C>m</C> is freed on <strong>every</strong> path out of <C>report()</C>, including early returns and
              exceptions.
            </Callout>
          </div>
        </Cols>
      ),
      notes: md(
        'The most common job of a destructor is to give back memory the constructor took with `new`. `Marks` allocates `new int[n]` in its constructor and frees it with `delete[]` in its destructor. Arrays allocated with `new[]` must be freed with `delete[]`, and single objects with `delete`; mixing them up is undefined behaviour.',
        'In `report()`, `m` is a local object, so its destructor is guaranteed to run however the function exits: normal return, early `return`, or an exception thrown halfway through. This is the most important property of destructors, and it costs no extra code.',
        'In `leaky()`, the `Marks` object itself lives on the heap. The local variable `p` is just a pointer, and destroying a pointer does nothing to what it points to. Without `delete p;`, `~Marks()` never runs, so both the `Marks` object and its `scores` array leak. Prefer local objects (or smart pointers, next slide) over raw `new`.',
      ),
    },
    {
      id: 'raii',
      kicker: 'Destructors',
      title: 'RAII: let destructors clean up',
      body: (
        <Cols wide="left">
          <Code>{RAII}</Code>
          <div className="space-y-[0.8em]">
            <Callout tone="ok" title="Resource Acquisition Is Initialization">
              Acquire a resource in a constructor, release it in the destructor. Clean-up then happens automatically on
              every path.
            </Callout>
            <SlideTable
              head={['Resource', 'RAII class']}
              rows={[
                ['heap object', <C key="u">unique_ptr / shared_ptr</C>],
                ['dynamic array', <C key="v">vector</C>],
                ['text', <C key="s">string</C>],
                ['file', <C key="f">ifstream / ofstream</C>],
                ['mutex lock', <C key="l">lock_guard</C>],
              ]}
            />
          </div>
        </Cols>
      ),
      notes: md(
        '**RAII** (*Resource Acquisition Is Initialization*) is the idiom that makes constructors and destructors so powerful. Tie every resource to the lifetime of an object: acquire it in the constructor, release it in the destructor. Because C++ guarantees the destructor runs when the object goes out of scope, the resource is always released: no matter how many `return` statements the function has, and even if an exception is thrown.',
        'The standard library is built this way. An `ofstream` opens a file in its constructor and closes it in its destructor. A `vector` and a `string` own their memory. A `unique_ptr<T>` owns a heap object and calls `delete` in its destructor, so `make_unique<Marks>(60)` gives you a heap `Marks` that cannot leak: `~Marks()` runs when `modern()` returns.',
        'In modern C++ you rarely write `delete` yourself. Use RAII types as members and the compiler-generated destructor, copy and move operations do the right thing: the **Rule of Zero** from slide 12.',
      ),
    },
    {
      id: 'const-objects',
      kicker: 'Constructors',
      title: 'const objects',
      body: (
        <Cols wide="left">
          <Code>{CONST_OBJ}</Code>
          <div className="space-y-[0.8em]">
            <Points
              items={[
                <>A const object is still built by a constructor, and must be initialised when defined.</>,
                <>
                  After construction only <strong>const (read-only) methods</strong> may be called.
                </>,
                <>
                  Mark every method that does not modify the object with <C>const</C> after its parameter list.
                </>,
              ]}
            />
            <Callout tone="tip" title="Getters">
              <C>const string&amp; getName() const</C> returns without copying and without allowing writes.
            </Callout>
          </div>
        </Cols>
      ),
      notes: md(
        'A `const` object can be read but never modified after it is created. Its **constructor still runs** (that is the only moment the object may be written to), so a const object must be initialised when it is defined. `const Account none;` fails twice over: there is no default constructor, and an uninitialised const object would be useless.',
        'Once the object exists, the compiler only allows calls to methods marked **`const`** after their parameter list. Such a method promises not to change any data member, and the compiler checks the promise. Without the qualifier, the compiler must assume a method *might* write (it only sees the declaration), so it refuses the call: *"passing `const Account` as `this` argument discards qualifiers"*.',
        'Good practice is therefore to mark **every** method that does not modify the object as `const`, especially getters. Returning `const string&` avoids copying the string while preventing the caller from writing to the private member through the reference.',
      ),
    },
    {
      id: 'other-languages',
      kicker: 'OOP beyond C++',
      title: 'Same idea in other OOP languages',
      body: (
        <div className="space-y-[0.9em]">
          <SlideTable
            head={['', 'C++', 'Java', 'Python']}
            rows={[
              [
                'Constructor',
                <C key="1">ClassName(...)</C>,
                <C key="2">ClassName(...)</C>,
                <C key="3">__init__(self, ...)</C>,
              ],
              ['Destructor', <C key="4">~ClassName()</C>, 'none (garbage collector)', <C key="5">__del__</C>],
              ['Clean-up timing', 'exactly at end of scope / delete', 'whenever the GC runs', 'not guaranteed'],
              [
                'Reliable clean-up',
                'destructor (RAII)',
                <C key="6">try-with-resources / close()</C>,
                <C key="7">with</C>,
              ],
            ]}
          />
          <Cols>
            <Code label="Java" language="java">
              {JAVA}
            </Code>
            <Code label="Python" language="python">
              {PYTHON}
            </Code>
          </Cols>
        </div>
      ),
      notes: md(
        'Every object-oriented language has constructors, because every language needs objects to start in a valid state. Java constructors look almost exactly like C++ ones. Python uses the special method `__init__`, which initialises an object that `__new__` has already created.',
        'Destructors are where C++ is different. C++ destruction is **deterministic**: you know the exact line where the destructor runs. Java has **no destructors**; memory is reclaimed by the garbage collector at some unspecified later time, and the old `finalize()` method is deprecated. For files and connections, Java uses `AutoCloseable` with *try-with-resources*, which calls `close()` at the end of the block.',
        "Python has `__del__`, but when (or whether) it runs depends on the interpreter and on reference cycles, so it must not be relied on for clean-up. Python's reliable tool is the `with` statement (a *context manager*). Both are language features that recreate, for specific blocks, what C++ destructors give you for every object.",
      ),
    },
    {
      id: 'mistakes',
      kicker: 'Avoid these',
      title: 'Common mistakes',
      body: (
        <SlideTable
          head={['❌ Mistake', '✅ Correct']}
          rows={[
            [<C key="1">void Account() {'{ }'}</C>, <>Constructors have no return type</>],
            [<C key="2">~Account(int x)</C>, <>Destructors take no parameters</>],
            [
              <>
                <C key="3">Account a;</C> after adding <C key="3b">Account(string)</C>
              </>,
              <>
                Add a default constructor, a default argument or <C key="3c">= default</C>
              </>,
            ],
            [<C key="4">Counter c();</C>, <C key="4b">Counter c;</C>],
            [<>Raw owning pointer, no copy constructor</>, <>Rule of Three, or better, Rule of Zero</>],
            [<C key="6">int* p = new int[n]; delete p;</C>, <C key="6b">delete[] p;</C>],
            [<>Non-virtual destructor in a polymorphic base</>, <C key="7">virtual ~Base()</C>],
            [<C key="8">obj.ClassName(args);</C>, <C key="8b">obj = ClassName(args);</C>],
            [<>Initializer list in a different order than the declarations</>, <>Match the declaration order</>],
            [<>Throwing from a destructor</>, <>Destructors must not throw</>],
          ]}
        />
      ),
      notes: md(
        'A checklist of the errors that show up most often in assignments and exams:',
        "1. Giving a constructor a return type is a compile error: only a constructor may use the class's name.\n2. Destructors can never take parameters, so they cannot be overloaded.\n3. Declaring any constructor removes the implicit default constructor.\n4. `Counter c();` declares a function (the most vexing parse).\n5. A class that owns memory through a raw pointer and relies on the compiler's shallow copy ends in a double free.\n6. `new[]` must be paired with `delete[]`, and `new` with `delete`.\n7. A polymorphic base class without a virtual destructor leaks (undefined behaviour) when deleted through a base pointer.\n8. A constructor cannot be called on an existing object; assign a new temporary instead.\n9. Members are initialised in declaration order regardless of the initializer list order (compile with `-Wall` to get a warning).\n10. An exception escaping a destructor during stack unwinding terminates the program.",
      ),
    },
    {
      id: 'check',
      kicker: 'Check yourself',
      title: 'Quick quiz',
      body: (
        <Cols>
          <div className="space-y-[0.7em]">
            <Reveal
              number={1}
              question={
                <div className="space-y-[0.4em]">
                  <p>
                    What does this print? (<C>Tracer</C> prints <C>+</C> / <C>-</C> as before.)
                  </p>
                  <Code>{QUIZ_ORDER}</Code>
                </div>
              }
              answer={
                <>
                  <C>+ 1</C>, <C>+ 2</C>, <C>- 2</C>, <C>+ 3</C>, <C>- 3</C>, <C>- 1</C>. <C>b</C> dies at its
                  block&apos;s brace; <C>c</C> and <C>a</C> die at the end of <C>main</C> in reverse order.
                </>
              }
            />
          </div>
          <div className="space-y-[0.7em]">
            <Reveal
              number={2}
              question={
                <div className="space-y-[0.4em]">
                  <p>Which numbered lines are errors?</p>
                  <Code>{QUIZ_CTOR}</Code>
                </div>
              }
              answer={
                <>
                  (1) and (3). A constructor cannot have a return type (g++: &quot;return type specification for
                  constructor invalid&quot;), and a destructor cannot have parameters. (2) is a valid constructor.
                </>
              }
            />
            <Reveal
              number={3}
              question={<>True or false: a class can have two destructors if their parameter lists differ.</>}
              answer={<>False. A destructor has no parameters, so there is exactly one per class.</>}
            />
            <Reveal
              number={4}
              question={
                <>
                  A class has only <C>Account(const string&amp;)</C>. Does <C>Account list[3];</C> compile?
                </>
              }
              answer={<>No. Each array element needs a default constructor, and declaring a constructor removed it.</>}
            />
          </div>
        </Cols>
      ),
      notes: md(
        'Use these to check understanding before moving on. Each question maps to an earlier slide.',
        '**Q1** is about scope and LIFO order (slides 16 and 17). `b` lives only inside the inner braces, so it is created and destroyed before `c` even exists.',
        '**Q2** combines the naming rules. Constructors have no return type (slide 4), and a member function cannot simply reuse the class name with a return type, so `void Pen()` is rejected by the compiler. Destructors cannot have parameters (slide 15).',
        '**Q3**: overloading needs different parameter lists, and a destructor has none. **Q4**: arrays default-construct every element, and the implicit default constructor disappears once any constructor is declared (slide 6).',
      ),
    },
    {
      id: 'summary',
      kicker: 'Summary',
      title: 'Constructor vs destructor',
      body: (
        <SlideTable
          head={['', 'Constructor', 'Destructor']}
          rows={[
            ['Name', <C key="1">ClassName</C>, <C key="2">~ClassName</C>],
            ['Return type', 'none (not even void)', 'none'],
            ['Parameters', 'any, including defaults', 'none'],
            ['Overloading', 'yes, many per class', 'no, exactly one'],
            ['Called', 'automatically when an object is created', 'automatically when its lifetime ends'],
            ['Compiler-generated', 'default ctor only if no ctor declared; copy ctor', 'yes, if not declared'],
            ['virtual?', 'never', 'yes, required in polymorphic bases'],
            ['Order', 'bases → members → body', 'body → members → bases'],
            ['Typical job', 'establish a valid state, acquire resources', 'release resources (RAII)'],
          ]}
        />
      ),
      notes: md(
        "The whole topic on one slide. Constructors and destructors are a matched pair. One establishes the object's invariants and acquires what it needs; the other releases those resources. The compiler calls both automatically, in a strictly defined order.",
        'If you remember only three things: (1) a constructor has **no return type** and a destructor has **no parameters**; (2) destruction always happens in the **reverse order** of construction; (3) put clean-up in destructors and **let scope do the work** (RAII). Prefer `vector`, `string` and smart pointers so that the compiler-generated versions are correct.',
      ),
    },
  ],
};
