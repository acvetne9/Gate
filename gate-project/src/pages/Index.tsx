import { Button } from "@/components/ui/button";
import { ArrowRight, Sparkles, Heart, Zap } from "lucide-react";
import { PageLayout } from '../components'

const Index = () => {
  return (
    <PageLayout activeRoute="/">
      <div className="min-h-screen bg-gradient-subtle">
      {/* Hero Section */}
      <section className="pt-32 pb-20 px-6">
        <div className="container mx-auto text-center max-w-4xl">
          <div className="opacity-0 animate-fade-up">
            <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-secondary text-secondary-foreground text-sm font-body mb-8">
              <Sparkles className="w-4 h-4 text-primary" />
              Welcome to the future
            </span>
          </div>
          
          <h1 className="opacity-0 animate-fade-up animate-delay-100 font-display text-5xl md:text-7xl font-semibold text-foreground leading-tight mb-6">
            Create something{" "}
            <span className="text-gradient italic">beautiful</span>{" "}
            today
          </h1>
          
          <p className="opacity-0 animate-fade-up animate-delay-200 font-body text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed">
            We help you bring your ideas to life with elegant design and powerful tools. 
            Start your journey with us and transform the way you work.
          </p>
          
          <div className="opacity-0 animate-fade-up animate-delay-300 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button variant="hero" size="xl">
              Start Free Trial
              <ArrowRight className="w-5 h-5" />
            </Button>
            <Button variant="subtle" size="xl">
              Learn More
            </Button>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-24 px-6 bg-card">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-16">
            <h2 className="font-display text-4xl md:text-5xl font-semibold text-foreground mb-4">
              Why choose us?
            </h2>
            <p className="font-body text-muted-foreground text-lg max-w-xl mx-auto">
              We provide everything you need to succeed in today's world.
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                icon: Sparkles,
                title: "Elegant Design",
                description: "Beautiful interfaces that delight your users and make your brand stand out."
              },
              {
                icon: Zap,
                title: "Lightning Fast",
                description: "Optimized performance that keeps your users engaged and happy."
              },
              {
                icon: Heart,
                title: "Made with Care",
                description: "Every detail crafted with attention to create the perfect experience."
              }
            ].map((feature, index) => (
              <div 
                key={index}
                className="group p-8 rounded-2xl bg-background border border-border hover:border-primary/30 hover:shadow-soft transition-all duration-300"
              >
                <div className="w-12 h-12 rounded-xl bg-gradient-warm flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                  <feature.icon className="w-6 h-6 text-primary-foreground" />
                </div>
                <h3 className="font-display text-2xl font-semibold text-foreground mb-3">
                  {feature.title}
                </h3>
                <p className="font-body text-muted-foreground leading-relaxed">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section id="contact" className="py-24 px-6">
        <div className="container mx-auto max-w-4xl text-center">
          <h2 className="font-display text-4xl md:text-5xl font-semibold text-foreground mb-6">
            Ready to get started?
          </h2>
          <p className="font-body text-lg text-muted-foreground mb-10 max-w-xl mx-auto">
            Join thousands of satisfied customers who have transformed their work with our platform.
          </p>
          <Button variant="hero" size="xl">
            Start Your Journey
            <ArrowRight className="w-5 h-5" />
          </Button>
        </div>
      </section>

      </div>
    </PageLayout>
  );
};

export default Index;
